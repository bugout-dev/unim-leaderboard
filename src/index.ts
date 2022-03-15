import Koa from "koa";
import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import cors from "@koa/cors";
import axios from "axios";
import web3 from "web3";

import BugoutClient, { BugoutTypes } from "@bugout/bugout-js";

const client = new BugoutClient();

const app = new Koa();
app.use(bodyParser());
const router = new Router();
const corsConfiguration = cors({ allowMethods: "GET" });

const UNIM_LEADERBOARD_PORT = process.env.UNIM_LEADERBOARD_PORT || 14601;
const LEADERBOARD_APPLICATION_ID = process.env.LEADERBOARD_APPLICATION_ID || "";
const MOONSTREAM_ACCESS_TOKEN = process.env.MOONSTREAM_ACCESS_TOKEN || "";
const FULL_DATA_QUERY_NAME = process.env.FULL_DATA_QUERY_NAME || "";
const MOONSTREAM_QUERY_URL = process.env.MOONSTREAM_QUERY_URL || "";

interface StatusResponse {
  lastRefresh: number;
  nextRefresh: number;
}

interface CountAddressesResponse {
  addresses: number;
}

interface CountUNIMResponse {
  balance: number;
}

interface QuartilesResponse {
  persent_25: LeaderboardItem;
  persent_50: LeaderboardItem;
  persent_75: LeaderboardItem;
}

interface LeaderboardItem {
  address: string;
  balance: number;
}

interface LeaderboardResponse {
  blockNumber: number;
  blockTimestamp: number;
  leaderboard: Array<LeaderboardItem>;
  offset: number;
  limit: number;
}

function compare_rank(a: any, b: any) {
  if (a.rank < b.rank) {
    return -1;
  }
  if (a.rank > b.rank) {
    return 1;
  }
  return 0;
}

function compare_addresses(a: any, b: any) {
  if (a.rank < b.rank) {
    return -1;
  }
  if (a.rank > b.rank) {
    return 1;
  }
  return 0;
}

async function quantile(arr: any, q: any) {
  /* get array of values and split it to quartiles parts  */
  /* We need get rank and make quartiles by them not as bucket of position */

  const sorted_array = arr.sort(compare_rank); // sort return array itself

  const pos = sorted_array[sorted_array.length - 1].rank * q; // get desent rank
  const base = Math.floor(pos); // round to floor

  const floor_quartile_users = sorted_array
    .filter((element: any) => {
      return element.rank == base;
    })
    .sort(compare_addresses);

  //const rest = pos - base;
  if (floor_quartile_users.length > 0) {
    return floor_quartile_users[floor_quartile_users.length - 1];
  }
}

async function checkAuth(ctx: Koa.BaseContext, next: () => Promise<any>) {
  if (ctx.headers["authorization"]) {
    const user_token_list = ctx.headers["authorization"].split(" ");
    if (user_token_list.length != 2) {
      ctx.status = 403;
      ctx.body = { error: "Wrong authorization header" };
    } else {
      try {
        const user: BugoutTypes.BugoutUser = await client.getUser(
          user_token_list[1]
        );
        console.log(user);
        if (!user.verified) {
          console.log(
            `Attempted journal access by unverified Brood account: ${user.id}`
          );
          ctx.status = 403;
          ctx.body = { error: "Wrong authorization header" };
        } else {
          if (user.application_id != LEADERBOARD_APPLICATION_ID) {
            ctx.status = 403;
            ctx.body = { error: "User does not belong to this application" };
          } else {
            await next();
          }
        }
      } catch (Error: any) {
        console.log(Error);
        ctx.status = 404;
        ctx.body = { error: `Credential not found` };
      }
    }
  } else {
    ctx.status = 404;
    ctx.body = { error: "Authorization header not found" };
  }
}

router.use(["/update"], checkAuth);

async function syncBucket(
  cache_name: string,
  access_url: string,
  next_update: number
) {
  // Request data update

  if (!app.context.hasOwnProperty("cache_status")) {
    app.context.cache_status = {};
  }

  let response = await axios.get(access_url, {
    headers: { Accept: "application/json" },
  });

  app.context[cache_name] = await response.data;

  app.context[cache_name]["25%"] = await quantile(response.data["data"], 0.25);
  app.context[cache_name]["50%"] = await quantile(response.data["data"], 0.5);
  app.context[cache_name]["75%"] = await quantile(response.data["data"], 0.75);

  const index_data: { [key: string]: any } = {};

  let sum = 0;

  for (let i = 1; i < response.data["data"].length; i++) {
    sum += response.data["data"][i].unim_balance;

    index_data[response.data["data"][i]["address"]] = {
      unim_balance: response.data["data"][i]["unim_balance"],
      rank: response.data["data"][i]["rank"],
      position: i,
    };
  }

  app.context.full_data["total"] = sum;

  app.context.index_data = index_data;

  app.context.cache_status[cache_name] = {
    "last-modified": response.headers["last-modified"],
    next_refresh: next_update,
  };
  console.log(`synchronized ${cache_name}`);
}

async function firstSync() {
  // Get access to bucket
  try {
    let response = await axios.get(
      `${MOONSTREAM_QUERY_URL}/queries/${FULL_DATA_QUERY_NAME}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${MOONSTREAM_ACCESS_TOKEN}`,
        },
      }
    );

    let data = await response.data;

    let next_update = Math.floor(Date.now() / 1000) + 3 * 60 * 60;

    await syncBucket(FULL_DATA_QUERY_NAME, data.url, next_update);
  } catch (Error: any) {
    console.log(Error.message);
  }
}

firstSync();

router.get("/status", async (ctx) => {
  ctx.body = ctx.cache_status;
});

router.get("/count/addresses", async (ctx) => {
  const response: CountAddressesResponse = {
    addresses: ctx.full_data.data.length,
  };
  ctx.body = response;
});

router.get("/count/unim", async (ctx) => {
  const response: CountUNIMResponse = {
    balance: ctx.full_data["total"],
  };
  ctx.body = response;
});

router.get("/quartiles", async (ctx) => {
  const response: QuartilesResponse = {
    persent_25: ctx.full_data["25%"],
    persent_50: ctx.full_data["50%"],
    persent_75: ctx.full_data["75%"],
  };
  ctx.body = response;
});

router.get("/position", async (ctx) => {
  const windowSizeRaw = ctx.query.window_size ? ctx.query.window_size[0] : "1";
  const windowSize = parseInt(windowSizeRaw);
  if (
    ctx.query.address &&
    ctx.index_data.hasOwnProperty(
      web3.utils.toChecksumAddress(ctx.query.address.toString())
    )
  ) {
    const address = web3.utils.toChecksumAddress(ctx.query.address.toString());
    const position = ctx.index_data[address]["position"];
    const response = ctx.full_data["data"].slice(
      position - windowSize,
      position + windowSize + 1
    );
    ctx.body = response;
  } else {
    ctx.body = {};
  }
});

router.get("/leaderboard", async (ctx) => {
  if (ctx.query.offset && ctx.query.offset.toString() != ctx.query.offset) {
    ctx.query.offset = ctx.query.offset[0];
  }
  if (ctx.query.limit && ctx.query.limit.toString() != ctx.query.limit) {
    ctx.query.limit = ctx.query.limit[0];
  }
  const offset: number = parseInt(ctx.query.offset || "0");
  const limit: number = parseInt(ctx.query.limit || "10");

  const response: LeaderboardResponse = {
    blockNumber: ctx.full_data["block_number"],
    blockTimestamp: ctx.full_data["block_timestamp"],
    leaderboard: ctx.full_data.data.slice(offset, offset + limit),
    offset: offset,
    limit: limit,
  };
  ctx.body = response;
});

router.post("/update", async (ctx) => {
  //console.log(ctx.request.body);
  const cache_name = ctx.request.body.cache_name;
  const access_url = ctx.request.body.access_url;
  const next_update = ctx.request.body.next_update;
  await syncBucket(cache_name, access_url, next_update);
  ctx.body = ctx.cache_status;
});

app.use(corsConfiguration).use(router.routes());

app.listen(UNIM_LEADERBOARD_PORT, () => {
  client
    .pingBrood()
    .then((response: BugoutTypes.BugoutPing) =>
      console.log(`Brood check:`, response)
    );
  console.log(
    `UNIM Leaderboard server listening on port ${UNIM_LEADERBOARD_PORT}`
  );
});
