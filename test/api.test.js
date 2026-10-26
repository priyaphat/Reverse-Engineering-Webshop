import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

const config = loadConfig({
  NODE_ENV: "test",
  VERIFY_PROVIDER: "mock",
  RATE_LIMIT_MAX: "100",
  SESSION_TTL_SECONDS: "900"
});

let server;
let baseUrl;

before(async () => {
  server = createApp(config).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers }
  });
  return { response, body: await response.json() };
}

test("health reports fixed Taiwan configuration", async () => {
  const { response, body } = await request("/health");
  assert.equal(response.status, 200);
  assert.equal(body.region, "TW");
  assert.equal(body.currency, "TWD");
});

test("serves the UID top-up web interface", async () => {
  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(html, /Aniimo UID Top-Up/);
});

test("verifies a known mock character", async () => {
  const { response, body } = await request("/api/v1/aniimo/verify", {
    method: "POST",
    body: JSON.stringify({ uid: "10000001", server: "TW1" })
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.characterName, "ArielTester");
  assert.equal(body.data.currency, "TWD");
});

test("rejects malformed identifiers", async () => {
  const { response, body } = await request("/api/v1/aniimo/verify", {
    method: "POST",
    body: JSON.stringify({ uid: "../bad", server: "TW 1" })
  });
  assert.equal(response.status, 400);
  assert.equal(body.error.code, "VALIDATION_ERROR");
});

test("returns a stable not-found error for an unknown character", async () => {
  const { response, body } = await request("/api/v1/aniimo/verify", {
    method: "POST",
    body: JSON.stringify({ uid: "99999999", server: "TW1" })
  });
  assert.equal(response.status, 404);
  assert.equal(body.error.code, "CHARACTER_NOT_FOUND");
});

test("creates and reads a MyCard-only top-up session", async () => {
  const created = await request("/api/v1/aniimo/sessions", {
    method: "POST",
    body: JSON.stringify({ uid: "10000001", server: "TW1", productId: "pack.twd.01", paymentMethod: "MyCard" })
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.paymentMethod, "mycard");
  assert.equal(created.body.data.status, "verified");

  const fetched = await request(`/api/v1/aniimo/sessions/${created.body.data.id}`);
  assert.equal(fetched.response.status, 200);
  assert.equal(fetched.body.data.id, created.body.data.id);
});

test("rejects any payment method other than MyCard", async () => {
  const { response, body } = await request("/api/v1/aniimo/sessions", {
    method: "POST",
    body: JSON.stringify({ uid: "10000001", server: "TW1", productId: "pack.twd.01", paymentMethod: "card" })
  });
  assert.equal(response.status, 400);
  assert.equal(body.error.code, "VALIDATION_ERROR");
});
