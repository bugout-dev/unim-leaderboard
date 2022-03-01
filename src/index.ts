import Koa from "koa";
import Router from "@koa/router";
import cors from "@koa/cors";
import axios from "axios";

const app = new Koa();
const router = new Router();
const corsConfiguration = cors({ allowMethods: "GET" });

const UNIM_LEADERBOARD_PORT = process.env.UNIM_LEADERBOARD_PORT || 14601;

interface StatusResponse {
  lastRefresh: number;
  nextRefresh: number;
}

interface CountAddressesResponse {
  addresses: number;
}

interface CountUNIMResponse {
  unim: number;
}

interface QuartilesResponse {
  persent_25: LeaderboardItem;
  persent_50: LeaderboardItem;
  persent_75: LeaderboardItem;
}

interface LeaderboardItem {
  address: string;
  unim: number;
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

async function syncBucket(app: any) {
  // Request data update
  let url = `https://s3.amazonaws.com/static.simiotics.com/LEADERBOARD_DATA/IMDEX_FILE.json`;

  // Post will return access link response structure
  // {"url": presign_url}
  let response = await axios.get(url, {
    headers: { "Content-Type": "application/json" },
  });

  app.context.index_data = await response.data;

  // Request data update
  url = `https://s3.amazonaws.com/static.simiotics.com/LEADERBOARD_DATA/FULL_LIST.json`;

  // Post will return access link response structure
  // {"url": presign_url}
  response = await axios.get(url, {
    headers: { "Content-Type": "application/json" },
  });

  app.context.full_data = await response.data;
  app.context.last_modified = response.headers["last-modified"];
  console.log("synchronized");
}

syncBucket(app);

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
    unim: ctx.full_data["total"],
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
  if (ctx.query.address && ctx.query.window_size) {
    const position =
      ctx.index_data["data"][ctx.query.address.toString()]["position"];
    let window_size = parseInt(ctx.query.window_size[0]);
    const response = ctx.full_data["data"].slice(
      position - window_size,
      position + window_size + 1
    );
    ctx.body = response;
  }
});

router.post("/update", async (ctx) => {
  syncBucket(app);
  ctx.body = "Updating";
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

app.use(corsConfiguration).use(router.routes());

app.listen(UNIM_LEADERBOARD_PORT, () => {
  console.log(
    `UNIM Leaderboard server listening on port ${UNIM_LEADERBOARD_PORT}`
  );
});
