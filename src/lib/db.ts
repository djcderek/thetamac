import { PrismaClient } from "@prisma/client";
import {
  executeWithTransientReadRetry,
  isRetryableReadOperation,
} from "./database-resilience";

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }).$extends({
    name: "transient-read-retry",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!isRetryableReadOperation(operation)) {
            return query(args);
          }

          return executeWithTransientReadRetry({
            model,
            operation,
            query: () => query(args),
          });
        },
      },
    },
  });
}

type PrismaClientWithReadRetry = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientWithReadRetry | undefined;
};

// Force new instance if schema changed
export const db =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
