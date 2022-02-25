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
const axios_1 = __importDefault(require("axios"));
const app = new koa_1.default();
const router = new router_1.default();
const corsConfiguration = (0, cors_1.default)({ allowMethods: "GET" });
const UNIM_LEADERBOARD_PORT = process.env.UNIM_LEADERBOARD_PORT || 14601;
const toTimestamp = (strDate) => {
    const dt = Date.parse(strDate);
    return dt / 1000;
};
function syncBucket(app) {
    return __awaiter(this, void 0, void 0, function* () {
        // Request data update
        let url = `https://s3.amazonaws.com/static.simiotics.com/LEADERBOARD_DATA/IMDEX_FILE.json`;
        // Post will return access link response structure
        // {"url": presign_url}
        let response = yield axios_1.default.get(url, {
            headers: { "Content-Type": "application/json" },
        });
        app.context.index_data = yield response.data;
        // Request data update
        url = `https://s3.amazonaws.com/static.simiotics.com/LEADERBOARD_DATA/FULL_LIST.json`;
        // Post will return access link response structure
        // {"url": presign_url}
        response = yield axios_1.default.get(url, {
            headers: { "Content-Type": "application/json" },
        });
        app.context.full_data = yield response.data;
        app.context.last_modified = response.headers["last-modified"];
        console.log("synchronized");
    });
}
syncBucket(app);
router.get("/status", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const nowEpoch = toTimestamp(ctx.last_modified);
    const response = {
        lastRefresh: nowEpoch,
        nextRefresh: nowEpoch + 10800,
    };
    ctx.body = response;
}));
router.get("/count/addresses", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const response = {
        addresses: ctx.full_data.data.length,
    };
    ctx.body = response;
}));
router.get("/count/unim", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const response = {
        unim: ctx.full_data["total"],
    };
    ctx.body = response;
}));
router.get("/quartiles", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const response = {
        persent_25: ctx.full_data["25%"],
        persent_50: ctx.full_data["50%"],
        persent_75: ctx.full_data["75%"],
    };
    ctx.body = response;
}));
router.get("/position", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (ctx.query.address && ctx.query.window_size) {
        console.log(ctx.query.address.toString());
        const position = ctx.index_data["data"][ctx.query.address.toString()]["position"];
        let window_size = parseInt(ctx.query.window_size[0]);
        const response = ctx.full_data["data"].slice(position - window_size, position + window_size + 1);
        ctx.body = response;
    }
}));
router.post("/update", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    syncBucket(app);
    ctx.body = "Updating";
}));
router.get("/leaderboard", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (ctx.query.offset && ctx.query.offset.toString() != ctx.query.offset) {
        ctx.query.offset = ctx.query.offset[0];
    }
    if (ctx.query.limit && ctx.query.limit.toString() != ctx.query.limit) {
        ctx.query.limit = ctx.query.limit[0];
    }
    const offset = parseInt(ctx.query.offset || "0");
    const limit = parseInt(ctx.query.limit || "10");
    const response = {
        blockNumber: ctx.full_data["block_number"],
        blockTimestamp: ctx.full_data["block_timestamp"],
        leaderboard: ctx.full_data.data.slice(offset, offset + limit),
        offset: offset,
        limit: limit,
    };
    ctx.body = response;
}));
app.use(corsConfiguration).use(router.routes());
app.listen(UNIM_LEADERBOARD_PORT, () => {
    console.log(`UNIM Leaderboard server listening on port ${UNIM_LEADERBOARD_PORT}`);
});
