import { createHmac } from "node:crypto";
import { AppError, UpstreamError } from "../errors.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseRetryAfter(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 60) : null;
}

function normalizeResponse(payload) {
  const source = payload?.data ?? payload;
  const characterName = source?.characterName ?? source?.character_name ?? source?.roleName ?? source?.role_name;
  if (typeof characterName !== "string" || !characterName.trim()) {
    throw new UpstreamError(502, "UPSTREAM_SCHEMA_ERROR", "UID provider returned an unexpected response");
  }
  return {
    characterName: characterName.trim(),
    level: Number.isFinite(Number(source.level)) ? Number(source.level) : null,
    upstreamRequestId: payload?.requestId ?? payload?.request_id ?? null
  };
}

export class RemoteVerificationProvider {
  constructor(config, dependencies = {}) {
    this.url = config.upstreamUrl;
    this.token = config.upstreamToken;
    this.signingSecret = config.signingSecret;
    this.timeoutMs = config.timeoutMs;
    this.maxRetries = config.maxRetries;
    this.fetch = dependencies.fetch ?? globalThis.fetch;
    this.now = dependencies.now ?? Date.now;
    this.failures = 0;
    this.openUntil = 0;
  }

  async verify({ uid, server }) {
    if (this.now() < this.openUntil) {
      throw new UpstreamError(503, "UPSTREAM_CIRCUIT_OPEN", "UID provider is temporarily unavailable", 30);
    }

    const body = JSON.stringify({ uid, server, region: "TW" });
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const timestamp = String(this.now());
      const headers = {
        "content-type": "application/json",
        "accept": "application/json",
        "user-agent": "aniimo-uid-topup-api/1.0",
        "x-client-timestamp": timestamp
      };
      if (this.token) headers.authorization = `Bearer ${this.token}`;
      if (this.signingSecret) {
        headers["x-client-signature"] = createHmac("sha256", this.signingSecret)
          .update(`${timestamp}.${body}`)
          .digest("hex");
      }

      try {
        const response = await this.fetch(this.url, { method: "POST", headers, body, signal: controller.signal });
        const payload = await response.json().catch(() => null);
        if (response.ok) {
          this.failures = 0;
          return normalizeResponse(payload);
        }
        if (response.status === 404 || response.status === 422) {
          this.failures = 0;
          throw new AppError(404, "CHARACTER_NOT_FOUND", "UID or server is invalid");
        }
        const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
        lastError = new UpstreamError(
          response.status === 429 ? 503 : 502,
          response.status === 429 ? "UPSTREAM_RATE_LIMITED" : "UPSTREAM_ERROR",
          response.status === 429 ? "UID provider rate limit reached" : "UID provider rejected the request",
          retryAfter ?? undefined
        );
        if (![429, 500, 502, 503, 504].includes(response.status)) {
          throw new AppError(lastError.status, lastError.code, lastError.message);
        }
        if (attempt < this.maxRetries) await sleep((retryAfter ? retryAfter * 1000 : 150 * 2 ** attempt) + Math.floor(Math.random() * 75));
      } catch (error) {
        if (error instanceof AppError && !(error instanceof UpstreamError)) throw error;
        lastError = error?.name === "AbortError"
          ? new UpstreamError(504, "UPSTREAM_TIMEOUT", "UID provider timed out")
          : error instanceof UpstreamError
            ? error
            : new UpstreamError(502, "UPSTREAM_UNAVAILABLE", "Could not reach UID provider");
        if (attempt < this.maxRetries) await sleep(150 * 2 ** attempt + Math.floor(Math.random() * 75));
      } finally {
        clearTimeout(timer);
      }
    }

    this.failures += 1;
    if (this.failures >= 5) this.openUntil = this.now() + 30_000;
    throw lastError;
  }
}
