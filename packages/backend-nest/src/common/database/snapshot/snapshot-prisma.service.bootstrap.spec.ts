import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Test } from "@nestjs/testing";
import { vi } from "vitest";

import { type SnapshotConfig, snapshotConfig } from "@/config/snapshot.config";
import { SnapshotPrismaService } from "./snapshot-prisma.service";

// The harness mock would hide both failures; use the real client here.
vi.unmock("@/common/database/snapshot/snapshot-prisma.client");

const MIGRATE_HINT =
  'Run "pnpm --filter @blurple-canvas-web/backend-nest prisma:snapshot:migrate"';

function createConfig(databasePath: string): SnapshotConfig {
  return {
    generate: true,
    availableForCanvases: [],
    schedulerIntervalMs: 60_000,
    databasePath,
    databaseUrl: `file:${databasePath}`,
    imageRoot: path.join(path.dirname(databasePath), "images"),
  };
}

async function initService(databasePath: string): Promise<void> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      SnapshotPrismaService,
      { provide: snapshotConfig.KEY, useValue: createConfig(databasePath) },
    ],
  }).compile();

  try {
    await moduleRef.init();
  } finally {
    await moduleRef.close();
  }
}

describe("SnapshotPrismaService bootstrap assertions", () => {
  let directory: string;

  beforeAll(() => {
    directory = mkdtempSync(path.join(tmpdir(), "blurple-snapshot-bootstrap-"));
  });

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("rejects when generation is enabled but the database file does not exist", async () => {
    const databasePath = path.join(directory, "missing.sqlite");

    await expect(initService(databasePath)).rejects.toThrow(
      `snapshot database is missing: ${databasePath}. ${MIGRATE_HINT}`,
    );
    expect(existsSync(databasePath)).toBe(false);
  });

  it("rejects when the database file exists but has not been migrated", async () => {
    const databasePath = path.join(directory, "empty.sqlite");
    writeFileSync(databasePath, "");

    await expect(initService(databasePath)).rejects.toThrow(
      `missing required tables: snapshot_manifest, snapshot_cursor. ${MIGRATE_HINT}`,
    );
  });
});
