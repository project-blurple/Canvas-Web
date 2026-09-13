import fs from "node:fs";
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";

import type { SnapshotConfig } from "@/config/snapshot.config";
import { snapshotConfig } from "@/config/snapshot.config";
import {
  createSnapshotPrismaClient,
  type SnapshotPrismaClient,
} from "./snapshot-prisma.client";

const REQUIRED_SNAPSHOT_TABLES = [
  "snapshot_manifest",
  "snapshot_cursor",
] as const;

class SnapshotPrismaClientSetup {
  constructor(databaseUrl: string) {
    // biome-ignore lint/correctness/noConstructorReturn: substitutes the client as `this`.
    return createSnapshotPrismaClient(databaseUrl);
  }
}

const SnapshotPrismaClientBase = SnapshotPrismaClientSetup as new (
  databaseUrl: string,
) => SnapshotPrismaClient;

/**
 * Injectable client for the snapshot SQLite datasource. Connecting is gated on
 * `snapshot.generate`, so disabled deployments stay inert (no file is created).
 */
@Injectable()
export class SnapshotPrismaService
  extends SnapshotPrismaClientBase
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(SnapshotPrismaService.name);
  private readonly generationEnabled: boolean;
  private readonly databasePath: string;

  constructor(@Inject(snapshotConfig.KEY) config: SnapshotConfig) {
    super(config.databaseUrl);
    this.generationEnabled = config.generate;
    this.databasePath = config.databasePath;
  }

  onModuleInit = async (): Promise<void> => {
    if (!this.generationEnabled) {
      return;
    }

    this.assertDatabaseFileExists();
    await this.$connect();
    await this.assertRequiredTablesExist();

    this.logger.log("Snapshot database connection established");
  };

  onApplicationShutdown = async (): Promise<void> => {
    await this.$disconnect();
  };

  // better-sqlite3 would create an empty file on connect; failing fast on a
  // missing file points the operator at the migrate command instead.
  private readonly assertDatabaseFileExists = (): void => {
    if (!fs.existsSync(this.databasePath)) {
      throw new Error(
        `Snapshot generation is enabled, but the snapshot database is missing: ${this.databasePath}. Run "pnpm --filter @blurple-canvas-web/backend-nest prisma:snapshot:migrate" to create it.`,
      );
    }
  };

  private readonly assertRequiredTablesExist = async (): Promise<void> => {
    const rows = await this.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name IN ('snapshot_manifest', 'snapshot_cursor')
    `;

    const foundTables = new Set(rows.map((row) => row.name));
    const missingTables = REQUIRED_SNAPSHOT_TABLES.filter(
      (tableName) => !foundTables.has(tableName),
    );

    if (missingTables.length > 0) {
      throw new Error(
        `Snapshot generation is enabled, but the snapshot database is missing required tables: ${missingTables.join(", ")}. Run "pnpm --filter @blurple-canvas-web/backend-nest prisma:snapshot:migrate" to repair it.`,
      );
    }
  };
}
