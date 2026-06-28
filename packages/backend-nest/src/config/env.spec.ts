import { validateEnv } from "./env";

const baseEnv = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  DISCORD_CLIENT_ID: "client-id",
  DISCORD_CLIENT_SECRET: "client-secret",
};

describe("validateEnv: SNAPSHOTS_AVAILABLE_FOR_CANVASES", () => {
  it("defaults to an empty allowlist when unset", () => {
    expect(
      validateEnv({ ...baseEnv }).SNAPSHOTS_AVAILABLE_FOR_CANVASES,
    ).toEqual([]);
  });

  it("treats an empty string as unset", () => {
    expect(
      validateEnv({ ...baseEnv, SNAPSHOTS_AVAILABLE_FOR_CANVASES: "" })
        .SNAPSHOTS_AVAILABLE_FOR_CANVASES,
    ).toEqual([]);
  });

  it("parses a JSON array of canvas IDs", () => {
    expect(
      validateEnv({ ...baseEnv, SNAPSHOTS_AVAILABLE_FOR_CANVASES: "[1, 2, 3]" })
        .SNAPSHOTS_AVAILABLE_FOR_CANVASES,
    ).toEqual([1, 2, 3]);
  });

  it("removes duplicate IDs", () => {
    expect(
      validateEnv({
        ...baseEnv,
        SNAPSHOTS_AVAILABLE_FOR_CANVASES: "[1, 2, 2, 3, 1]",
      }).SNAPSHOTS_AVAILABLE_FOR_CANVASES,
    ).toEqual([1, 2, 3]);
  });

  it.each([
    ["malformed JSON", "not-json"],
    ["a non-array value", "5"],
    ["non-integer IDs", "[1.5]"],
    ["non-positive IDs", "[0]"],
    ["string IDs", '["1"]'],
  ])("rejects %s", (_label, value) => {
    expect(() =>
      validateEnv({ ...baseEnv, SNAPSHOTS_AVAILABLE_FOR_CANVASES: value }),
    ).toThrow(/Invalid environment configuration/);
  });
});
