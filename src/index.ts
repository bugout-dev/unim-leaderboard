import Koa from "koa";
import Router from "@koa/router";
import cors from "@koa/cors";
import axios from "axios";
import web3 from "web3";

import BugoutClient, { BugoutTypes } from "@bugout/bugout-js";

const client = new BugoutClient();

const app = new Koa();
const router = new Router();
const corsConfiguration = cors({ allowMethods: "GET" });

const UNIM_LEADERBOARD_PORT = process.env.UNIM_LEADERBOARD_PORT || 14601;
const LEADERBOARD_APPLICATION_ID = process.env.LEADERBOARD_APPLICATION_ID || "";
const LEADERBOARD_IMDEX_FILE_QUERY_NAME =
  process.env.LEADERBOARD_IMDEX_FILE_QUERY_NAME || "";
const LEADERBOARD_FULL_LIST_QUERY_NAME =
  process.env.LEADERBOARD_FULL_LIST_QUERY_NAME || "";

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

const toTimestamp = (strDate: string) => {
  const dt = Date.parse(strDate);
  return dt / 1000;
};

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
  app: any,
  cache_name: string,
  access_url: string,
  next_update: number
) {
  // Request data update

  if (!app.context.hasOwnProperty("status")) {
    app.context.status = {};
  }

  let response = await axios.get(access_url, {
    headers: { "Content-Type": "application/json" },
  });

  app.context["cache_name"] = await response.data;

  app.context.status["cache_name"] = {
    "last-modified": response.headers["last-modified"],
    next_refresh: next_update,
  };
  console.log(`synchronized ${cache_name}`);
}

//syncBucket(app);

router.get("/status", async (ctx) => {
  const nowEpoch = toTimestamp(ctx.last_modified);
  const response: StatusResponse = {
    lastRefresh: nowEpoch,
    nextRefresh: nowEpoch + 10800,
  };
  ctx.body = response;
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
    ctx.index_data["data"].includes(
      web3.utils.toChecksumAddress(ctx.query.address.toString())
    )
  ) {
    const address = web3.utils.toChecksumAddress(ctx.query.address.toString());
    const position = ctx.index_data["data"][address]["position"];
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
  const cache_name = ctx.request.body.cache_name;
  const access_url = ctx.request.body.s3_pressign;
  const next_update = ctx.request.body.next_update;
  await syncBucket(app, cache_name, access_url, next_update);
  ctx.body = ctx.context.status;
});

app.use(corsConfiguration).use(router.routes());

app.listen(UNIM_LEADERBOARD_PORT, () => {
  client
    .pingBrood()
    .then((response: BugoutTypes.BugoutPing) =>
      console.log(`ping brood:`, response)
    );
  console.log(
    `UNIM Leaderboard server listening on port ${UNIM_LEADERBOARD_PORT}`
  );
});
