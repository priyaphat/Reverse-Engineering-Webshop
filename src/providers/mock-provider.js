import { AppError } from "../errors.js";

const fixtures = new Map([
  ["10000001:TW1", { characterName: "ArielTester", level: 42 }],
  ["10000002:TW1", { characterName: "Mimo", level: 18 }]
]);

export class MockVerificationProvider {
  async verify({ uid, server }) {
    const character = fixtures.get(`${uid}:${server.toUpperCase()}`);
    if (!character) {
      throw new AppError(404, "CHARACTER_NOT_FOUND", "UID or server is invalid");
    }
    return { ...character, upstreamRequestId: "mock" };
  }
}
