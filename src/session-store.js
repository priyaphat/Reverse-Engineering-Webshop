import { randomUUID } from "node:crypto";

export class SessionStore {
  constructor(ttlSeconds, now = Date.now) {
    this.ttlMs = ttlSeconds * 1000;
    this.now = now;
    this.sessions = new Map();
  }

  create(data) {
    const createdAt = this.now();
    const session = {
      id: randomUUID(),
      status: "verified",
      ...data,
      createdAt: new Date(createdAt).toISOString(),
      expiresAt: new Date(createdAt + this.ttlMs).toISOString()
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id) {
    const session = this.sessions.get(id);
    if (!session) return null;
    if (Date.parse(session.expiresAt) <= this.now()) {
      this.sessions.delete(id);
      return null;
    }
    return session;
  }
}
