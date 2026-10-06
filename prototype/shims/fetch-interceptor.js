// Answers every http(s) request of the app from sample data (sample-data/index.js `api()`), so the prototype works
// offline and never reaches a real backend or RPC node.
//
//   - data:/blob: URLs and same-origin requests pass through to the real fetch
//   - every answer takes 120-280 ms, like a network round trip
//   - "Offline" in the control panel makes every request fail like a dropped connection (TypeError)
//   - a request without sample data gets a 503 and a console warning naming it

import { api } from "./sample-data";

const proto = () => globalThis.__vnProto;
const realFetch = globalThis.fetch ? globalThis.fetch.bind(globalThis) : null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestBody(input, init) {
  if (init && typeof init.body === "string") return init.body;
  if (typeof Request !== "undefined" && input instanceof Request) return input.clone().text();
  return null;
}

globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (/^(data|blob):/.test(url) || !/^https?:/i.test(url) || (typeof location !== "undefined" && url.startsWith(location.origin))) {
    return realFetch(input, init);
  }
  const method = ((init && init.method) || (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")).toUpperCase();
  await sleep(120 + 160 * Math.random());
  if (proto() && proto().peek() === "offline") throw new TypeError("Network request failed");

  const text = method === "POST" ? await requestBody(input, init) : null;
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (error) {}

  let answer = null;
  try {
    answer = api(url, method, body);
  } catch (error) {
    console.warn("[prototype] sample data error for", url, error);
  }
  if (answer != null) {
    return new Response(JSON.stringify(answer), { status: 200, headers: { "content-type": "application/json" } });
  }
  console.warn("[prototype] no sample data for", method, url, body && body.method ? "(" + body.method + ")" : "");
  return new Response(JSON.stringify({ error: "not in the prototype" }), {
    status: 503,
    headers: { "content-type": "application/json" },
  });
};
