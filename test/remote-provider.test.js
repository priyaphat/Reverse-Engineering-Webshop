import assert from "node:assert/strict";
import { test } from "node:test";
import { RemoteVerificationProvider } from "../src/providers/remote-provider.js";

const baseConfig = {
  upstreamUrl: "https://merchant.example.test/verify",
  upstreamToken: "test-token",
  signingSecret: "test-secret",
  timeoutMs: 500,
  maxRetries: 0
};

test("remote provider sends the fixed TW region and maps a valid response", async () => {
  let captured;
  const provider = new RemoteVerificationProvider(baseConfig, {
    now: () => 1_700_000_000_000,
    fetch: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ data: { character_name: "RemoteMimo", level: 9 }, request_id: "req-1" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }
  });

  const result = await provider.verify({ uid: "10000001", server: "TW1" });
  assert.equal(result.characterName, "RemoteMimo");
  assert.equal(captured.url, baseConfig.upstreamUrl);
  assert.equal(captured.options.headers.authorization, "Bearer test-token");
  assert.match(captured.options.headers["x-client-signature"], /^[a-f0-9]{64}$/);
  assert.deepEqual(JSON.parse(captured.options.body), { uid: "10000001", server: "TW1", region: "TW" });
});

test("remote provider fails closed when the response schema drifts", async () => {
  const provider = new RemoteVerificationProvider(baseConfig, {
    fetch: async () => new Response(JSON.stringify({ data: { nickname_missing: "x" } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  });

  await assert.rejects(
    provider.verify({ uid: "10000001", server: "TW1" }),
    (error) => error.code === "UPSTREAM_SCHEMA_ERROR" && error.status === 502
  );
});

test("remote provider maps an upstream 404 without retrying", async () => {
  let calls = 0;
  const provider = new RemoteVerificationProvider({ ...baseConfig, maxRetries: 2 }, {
    fetch: async () => {
      calls += 1;
      return new Response(JSON.stringify({ code: 404 }), {
        status: 404,
        headers: { "content-type": "application/json" }
      });
    }
  });

  await assert.rejects(
    provider.verify({ uid: "99999999", server: "TW1" }),
    (error) => error.code === "CHARACTER_NOT_FOUND" && error.status === 404
  );
  assert.equal(calls, 1);
});
