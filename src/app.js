import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZodError } from "zod";
import { AppError } from "./errors.js";
import { createRateLimiter } from "./middleware/rate-limit.js";
import { MockVerificationProvider } from "./providers/mock-provider.js";
import { RemoteVerificationProvider } from "./providers/remote-provider.js";
import { SessionStore } from "./session-store.js";
import { createSessionSchema, verifySchema } from "./validation.js";

const publicDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");

function buildProvider(config) {
  return config.verifyProvider === "remote"
    ? new RemoteVerificationProvider(config)
    : new MockVerificationProvider();
}

function verificationResponse(input, result) {
  return {
    uid: input.uid,
    server: input.server,
    characterName: result.characterName,
    level: result.level ?? null,
    region: "TW",
    currency: "TWD",
    verifiedAt: new Date().toISOString()
  };
}

export function createApp(config, dependencies = {}) {
  const app = express();
  const provider = dependencies.provider ?? buildProvider(config);
  const sessions = dependencies.sessions ?? new SessionStore(config.sessionTtlSeconds);

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json({ limit: "16kb", strict: true }));
  app.use("/api", createRateLimiter({ windowMs: config.rateLimitWindowMs, max: config.rateLimitMax }));
  app.use(express.static(publicDirectory, { extensions: ["html"], maxAge: config.nodeEnv === "production" ? "1h" : 0 }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", provider: config.verifyProvider, region: "TW", currency: "TWD" });
  });

  app.post("/api/v1/aniimo/verify", async (req, res, next) => {
    try {
      const input = verifySchema.parse(req.body);
      const result = await provider.verify(input);
      res.json({ success: true, data: verificationResponse(input, result) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/aniimo/sessions", async (req, res, next) => {
    try {
      const input = createSessionSchema.parse(req.body);
      const result = await provider.verify(input);
      const session = sessions.create({
        uid: input.uid,
        server: input.server,
        characterName: result.characterName,
        productId: input.productId,
        region: "TW",
        currency: "TWD",
        paymentMethod: "mycard"
      });
      res.status(201).json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/aniimo/sessions/:id", (req, res, next) => {
    const session = sessions.get(req.params.id);
    if (!session) return next(new AppError(404, "SESSION_NOT_FOUND", "Session does not exist or has expired"));
    res.json({ success: true, data: session });
  });

  app.use((_req, _res, next) => next(new AppError(404, "ROUTE_NOT_FOUND", "Route not found")));
  app.use((error, _req, res, _next) => {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: error.issues }
      });
    }
    const status = Number.isInteger(error.status) ? error.status : 500;
    const code = error.code || "INTERNAL_ERROR";
    if (error.retryAfterSeconds) res.setHeader("Retry-After", String(error.retryAfterSeconds));
    res.status(status).json({
      success: false,
      error: {
        code,
        message: status >= 500 && code === "INTERNAL_ERROR" ? "Internal server error" : error.message,
        ...(error.details ? { details: error.details } : {})
      }
    });
  });
  return app;
}
