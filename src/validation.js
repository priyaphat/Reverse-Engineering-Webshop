import { z } from "zod";

const uid = z.string().trim().regex(/^\d{6,20}$/, "uid must contain 6-20 digits");
const server = z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9_-]+$/, "server has an invalid format");

export const verifySchema = z.object({ uid, server }).strict();

export const createSessionSchema = z.object({
  uid,
  server,
  productId: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/),
  paymentMethod: z.string().trim().transform((value) => value.toLowerCase()).pipe(z.literal("mycard"))
}).strict();
