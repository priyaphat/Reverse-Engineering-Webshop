import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  VERIFY_PROVIDER: z.enum(["mock", "remote"]).default("mock"),
  ANIIMO_UID_VERIFY_URL: z.string().url().optional().or(z.literal("")),
  ANIIMO_UPSTREAM_TOKEN: z.string().optional(),
  ANIIMO_SIGNING_SECRET: z.string().optional(),
  ANIIMO_TIMEOUT_MS: z.coerce.number().int().min(250).max(30000).default(5000),
  ANIIMO_MAX_RETRIES: z.coerce.number().int().min(0).max(4).default(2),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(30),
  SESSION_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900)
});

export function loadConfig(env = process.env) {
  const parsed = envSchema.parse(env);
  if (parsed.VERIFY_PROVIDER === "remote" && !parsed.ANIIMO_UID_VERIFY_URL) {
    throw new Error("ANIIMO_UID_VERIFY_URL is required when VERIFY_PROVIDER=remote");
  }
  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    verifyProvider: parsed.VERIFY_PROVIDER,
    upstreamUrl: parsed.ANIIMO_UID_VERIFY_URL || null,
    upstreamToken: parsed.ANIIMO_UPSTREAM_TOKEN || null,
    signingSecret: parsed.ANIIMO_SIGNING_SECRET || null,
    timeoutMs: parsed.ANIIMO_TIMEOUT_MS,
    maxRetries: parsed.ANIIMO_MAX_RETRIES,
    rateLimitWindowMs: parsed.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: parsed.RATE_LIMIT_MAX,
    sessionTtlSeconds: parsed.SESSION_TTL_SECONDS
  };
}
