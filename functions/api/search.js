// Cloudflare Pages Function: POST /api/search
// 클라이언트는 이 엔드포인트만 호출한다. 구글시트 주소·원본 데이터·비밀번호 값은
// 이 함수 밖으로(응답으로) 절대 나가지 않는다 — 매칭 결과(동/호/종류)만 돌려준다.

import * as matchLib from "../../match.js";

const CACHE_TTL_MS = 60_000;
// ponytail: Workers isolate 전역 변수로 60초 캐시. 콜드 isolate에서 가끔
// 재fetch되는 건 무해 — 별도 캐시 스토어 불필요.
let cache = { vehicles: null, password: null, fetchedAt: 0 };

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SEC = 60;

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("upstream fetch failed: " + res.status);
  return res.text();
}

async function loadData(env) {
  const now = Date.now();
  if (cache.vehicles && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }
  const [vehiclesText, settingsText] = await Promise.all([
    fetchText(env.VEHICLES_CSV_URL),
    fetchText(env.SETTINGS_CSV_URL),
  ]);
  cache = {
    vehicles: matchLib.parseVehiclesCSV(vehiclesText),
    password: matchLib.extractPassword(settingsText),
    fetchedAt: now,
  };
  return cache;
}

// 읽기 전용: 이미 한도를 넘겼는지만 확인 (카운트 증가 없음)
async function isRateLimited(env, ip) {
  if (!env.RATE_LIMIT_KV) return false; // 로컬 개발 등 KV 미바인딩 시 통과
  const raw = await env.RATE_LIMIT_KV.get(`rl:${ip}`);
  const count = raw ? parseInt(raw, 10) : 0;
  return count >= RATE_LIMIT_MAX;
}

// 비밀번호 실패 시에만 호출 — 정상 비번으로 여러 번 검색하는 입주민/경비원이
// 카운트에 걸리지 않도록, 성공 요청은 절대 카운트하지 않는다.
async function recordFailedAttempt(env, ip) {
  if (!env.RATE_LIMIT_KV) return;
  const key = `rl:${ip}`;
  const raw = await env.RATE_LIMIT_KV.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  await env.RATE_LIMIT_KV.put(key, String(count + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SEC,
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const ip = request.headers.get("cf-connecting-ip") || "unknown";

  if (await isRateLimited(env, ip)) {
    return json(429, { error: "rate_limited" });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json(400, { error: "bad_request" });
  }

  const password = String(body.password || "");
  const query = String(body.query || "").trim();

  let data;
  try {
    data = await loadData(env);
  } catch (e) {
    return json(502, { error: "upstream" });
  }

  if (!data.password || password !== data.password) {
    await recordFailedAttempt(env, ip);
    return json(401, { error: "bad_password" });
  }

  if (!query) {
    return json(200, { status: "ok" });
  }

  const matches = matchLib.findMatches(data.vehicles, query);

  if (matches.length === 0) {
    return json(200, { status: "none" });
  }
  if (matches.length === 1) {
    const v = matches[0];
    return json(200, { status: "one", dong: v.dong, ho: v.ho, type: v.type });
  }
  return json(200, {
    status: "many",
    results: matches.map((v) => ({ dong: v.dong, ho: v.ho, type: v.type })),
  });
}
