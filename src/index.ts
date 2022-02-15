import Koa from "koa";
import Router from "@koa/router";
import cors from "@koa/cors";

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

const MOCK_LEADERBOARD_ITEMS: Array<LeaderboardItem> = [
  { address: "0x0c609AC4DEEBAdd72197CA49DA6B7B7C76fC08Ac", unim: 5000 },
  { address: "0x67e94644849b61E7b59b164087F5dF1e38f4AaCf", unim: 3750 },
  { address: "0x50DE81c80F4B2bcf191E621feaA303b014952272", unim: 3000 },
  { address: "0x8404EFA98a4e129855c200FC4e90c257078d9eD3", unim: 2750 },
  { address: "0xF9A5BADdE63A85BD5a66669c0581Ad8819eF9057", unim: 2000 },
  { address: "0x88b3253b5fC6AEa6864e6EB8bb37DDc0B37E06B6", unim: 1250 },
  { address: "0x9f8B214bF13F62cFA5160ED135E233C9dDb95974", unim: 1250 },
  { address: "0x6527b87e1eD3D978BeafC8E8a9BD7bDeA79c3950", unim: 1000 },
  { address: "0xc031Ac97FAe8eAc6a2FDA4f16BCbea0389C03182", unim: 1000 },
  { address: "0xd84710a499174fddbBa6d63ce0a16B4B0ec7Fce5", unim: 750 },
  { address: "0x43539d0dc385c58Ae69d9B643F7CfdFdF1AE93Ba", unim: 750 },
  { address: "0x0C2C317CbE80EBb9D630548101AE70FF5db22439", unim: 750 },
  { address: "0x2b1094AEc8e5AAC6e88f29dBDCCfb3aD31f0213E", unim: 750 },
  { address: "0x403a5a6afd8C1f7857BC9F90386F6412DA0cD104", unim: 500 },
  { address: "0x8b33D6a5Df82c5cCD277949150F440bb1894b2C5", unim: 250 },
  { address: "0x176E71273B9c17974b23aad923C49E853d9cCbC8", unim: 250 },
  { address: "0xEdD95782d13902Ae535332b5D233041E47aD69E6", unim: 250 },
  { address: "0xF9389f72FA2FCF3B7A92C812145D82150Eb34636", unim: 250 },
];

router.get("/status", async (ctx) => {
  const now = new Date();
  const nowEpoch = Math.floor(now.getTime() / 1000);
  const response: StatusResponse = {
    lastRefresh: nowEpoch - 7200,
    nextRefresh: nowEpoch + 3600,
  };
  ctx.body = response;
});

router.get("/count/addresses", async (ctx) => {
  const response: CountAddressesResponse = {
    addresses: 42,
  };
  ctx.body = response;
});

router.get("/count/unim", async (ctx) => {
  const response: CountUNIMResponse = {
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
  const offset: number = parseInt(ctx.query.offset || "0");
  const limit: number = parseInt(ctx.query.limit || "3");

  const response: LeaderboardResponse = {
    blockNumber: 24980111,
    blockTimestamp: 1644957632,
    leaderboard: MOCK_LEADERBOARD_ITEMS.slice(offset, offset + limit),
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
