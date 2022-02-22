"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_1 = __importDefault(require("koa"));
const router_1 = __importDefault(require("@koa/router"));
const cors_1 = __importDefault(require("@koa/cors"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const app = new koa_1.default(); // looks like express
const router = new router_1.default();
const corsConfiguration = (0, cors_1.default)({ allowMethods: "GET" });
const UNIM_LEADERBOARD_PORT = process.env.UNIM_LEADERBOARD_PORT || 14601;
const MOONSTREAM_ACCES_TOKEN = process.env.MOONSTREAM_ACCES_TOKEN;
const MOONSTREAM_URL = process.env.MOONSTREAM_URL;
const MOONSTREAM_PORT = process.env.MOONSTREAM_PORT;
const LEADERBORD_QUERY = process.env.QUERY_URL;
const LEADERBORD_STORAGE = process.env.LEADERBORD_STORAGE;
//var LEADERBOARD_ITEMS:  Array<LeaderboardItem> =
function firstAsync(app) {
    return __awaiter(this, void 0, void 0, function* () {
        // Request data update
        let url = `https://moonstream-abi.s3.amazonaws.com/LEADERBOARD_DATA/IMDEX_FILE.json`;
        // Post will return access link response structure
        // {"url": presign_url}
        let response = yield (0, node_fetch_1.default)(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        app.context.index_data = yield response.json();
        // Request data update
        url = `https://moonstream-abi.s3.amazonaws.com/LEADERBOARD_DATA/FULL_LIST.json`;
        // Post will return access link response structure
        // {"url": presign_url}
        response = yield (0, node_fetch_1.default)(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        app.context.full_data = yield response.json();
    });
}
firstAsync(app);
// const MOCK_LEADERBOARD_ITEMS: Array<LeaderboardItem> = [
//   { address: "0x0c609AC4DEEBAdd72197CA49DA6B7B7C76fC08Ac", unim: 5000 },
//   { address: "0x67e94644849b61E7b59b164087F5dF1e38f4AaCf", unim: 3750 },
//   { address: "0x50DE81c80F4B2bcf191E621feaA303b014952272", unim: 3000 },
//   { address: "0x8404EFA98a4e129855c200FC4e90c257078d9eD3", unim: 2750 },
//   { address: "0xF9A5BADdE63A85BD5a66669c0581Ad8819eF9057", unim: 2000 },
//   { address: "0x88b3253b5fC6AEa6864e6EB8bb37DDc0B37E06B6", unim: 1250 },
//   { address: "0x9f8B214bF13F62cFA5160ED135E233C9dDb95974", unim: 1250 },
//   { address: "0x6527b87e1eD3D978BeafC8E8a9BD7bDeA79c3950", unim: 1000 },
//   { address: "0xc031Ac97FAe8eAc6a2FDA4f16BCbea0389C03182", unim: 1000 },
//   { address: "0xd84710a499174fddbBa6d63ce0a16B4B0ec7Fce5", unim: 750 },
//   { address: "0x43539d0dc385c58Ae69d9B643F7CfdFdF1AE93Ba", unim: 750 },
//   { address: "0x0C2C317CbE80EBb9D630548101AE70FF5db22439", unim: 750 },
//   { address: "0x2b1094AEc8e5AAC6e88f29dBDCCfb3aD31f0213E", unim: 750 },
//   { address: "0x403a5a6afd8C1f7857BC9F90386F6412DA0cD104", unim: 500 },
//   { address: "0x8b33D6a5Df82c5cCD277949150F440bb1894b2C5", unim: 250 },
//   { address: "0x176E71273B9c17974b23aad923C49E853d9cCbC8", unim: 250 },
//   { address: "0xEdD95782d13902Ae535332b5D233041E47aD69E6", unim: 250 },
//   { address: "0xF9389f72FA2FCF3B7A92C812145D82150Eb34636", unim: 250 },
// ];
router.get("/status", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const nowEpoch = Math.floor(now.getTime() / 1000);
    const response = {
        lastRefresh: nowEpoch - 7200,
        nextRefresh: nowEpoch + 3600,
    };
    ctx.body = response;
}));
router.get("/count/addresses", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const response = {
        addresses: 42,
    };
    ctx.body = response;
}));
router.get("/count/unim", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const response = {
        unim: 178564137,
    };
    ctx.body = response;
}));
router.get("/leaderboard", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
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
}));
app.use(corsConfiguration).use(router.routes());
app.listen(UNIM_LEADERBOARD_PORT, () => {
    console.log(`UNIM Leaderboard server listening on port ${UNIM_LEADERBOARD_PORT}`);
});
