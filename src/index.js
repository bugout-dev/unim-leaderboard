import Koa from "koa";
import Router from "@koa/router";
import cors from "@koa/cors";
import fetch from "node-fetch";

const app = new Koa(); // looks like express
const router = new Router();
const corsConfiguration = cors({ allowMethods: "GET" });

const UNIM_LEADERBOARD_PORT = process.env.UNIM_LEADERBOARD_PORT || 14601;

const MOONSTREAM_ACCES_TOKEN = process.env.MOONSTREAM_ACCES_TOKEN;

const MOONSTREAM_URL = process.env.MOONSTREAM_URL;

const MOONSTREAM_PORT = process.env.MOONSTREAM_PORT;

const LEADERBORD_QUERY = process.env.QUERY_URL;

const LEADERBORD_STORAGE = process.env.LEADERBORD_STORAGE;

async function firstAsync(app) {
  // Request data update
  let url = `https://s3.amazonaws.com/static.simiotics.com/LEADERBOARD_DATA/IMDEX_FILE.json`;

  // Post will return access link response structure
  // {"url": presign_url}
  let response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  app.context.index_data = await response.json();

  // Request data update
  url = `https://s3.amazonaws.com/static.simiotics.com/LEADERBOARD_DATA/FULL_LIST.json`;

  // Post will return access link response structure
  // {"url": presign_url}
  response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  app.context.full_data = await response.json();
}

firstAsync(app);

router.get("/status", async (ctx) => {
  const now = new Date();
  const nowEpoch = Math.floor(now.getTime() / 1000);
  const response = {
    lastRefresh: nowEpoch - 7200,
    nextRefresh: nowEpoch + 3600,
  };
  ctx.body = response;
});

router.get("/count/addresses", async (ctx) => {
  const response = {
    addresses: ctx.full_data.data.length,
  };
  ctx.body = response;
});

router.get("/count/unim", async (ctx) => {
  const response = {
    unim: 178564137,
  };
  ctx.body = response;
});

router.get("/leaderboard", async (ctx) => {
  if (ctx.query.offset && ctx.query.offset.toString() != ctx.query.offset) {
    ctx.query.offset = ctx.query.offset[0];
  }
  if (ctx.query.limit && ctx.query.limit.toString() != ctx.query.limit) {
    ctx.query.limit = ctx.query.limit[0];
  }
  const offset = parseInt(ctx.query.offset || "0");
  const limit = parseInt(ctx.query.limit || "3");

  const response = {
    blockNumber: ctx.full_data["block_number"],
    blockTimestamp: ctx.full_data["block_timestamp"],
    leaderboard: ctx.full_data.slice(offset, offset + limit),
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
