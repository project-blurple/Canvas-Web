import { Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";

import { PrismaService } from "@/common/database/prisma.service";

/** How often the store prunes expired sessions from the database. */
const SESSION_PRUNE_INTERVAL_MS = 2 * 60 * 1000;

@Injectable()
export class SessionStoreService implements OnApplicationShutdown {
  readonly store: PrismaSessionStore;

  constructor(prisma: PrismaService) {
    this.store = new PrismaSessionStore(prisma, {
      checkPeriod: SESSION_PRUNE_INTERVAL_MS,
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    });
  }

  onApplicationShutdown(): void {
    // Stop the prune timer so the process (and the test runner) can exit.
    this.store.stopInterval();
  }
}
