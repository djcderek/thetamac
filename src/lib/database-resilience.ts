const TRANSIENT_DATABASE_ERROR_CODES = new Set(["P1001", "P1002", "P1017"]);

const RETRYABLE_READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

export const DATABASE_READ_RETRY_DELAY_MS = 150;

type RetryLogEvent = {
  model: string;
  operation: string;
  code: string;
  attempt: number;
};

type ExecuteWithTransientReadRetryOptions<T> = {
  model?: string;
  operation: string;
  query: () => Promise<T>;
  delay?: (milliseconds: number) => Promise<void>;
  logRetry?: (event: RetryLogEvent) => void;
};

export function isRetryableReadOperation(operation: string): boolean {
  return RETRYABLE_READ_OPERATIONS.has(operation);
}

export function isTransientDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: unknown; message?: unknown };
  if (
    typeof candidate.code === "string" &&
    TRANSIENT_DATABASE_ERROR_CODES.has(candidate.code)
  ) {
    return true;
  }

  const message =
    typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";

  if (
    message.includes("can't reach database") ||
    message.includes("cannot reach database") ||
    message.includes("database server is unreachable")
  ) {
    return true;
  }

  return (
    message.includes("connection") &&
    (message.includes("closed") ||
      message.includes("timed out") ||
      message.includes("timeout") ||
      message.includes("unreachable"))
  );
}

export function getDatabaseErrorSummary(error: unknown) {
  if (!error || typeof error !== "object") {
    return { code: "UNKNOWN", transient: false };
  }

  const candidate = error as { code?: unknown };
  return {
    code: typeof candidate.code === "string" ? candidate.code : "UNKNOWN",
    transient: isTransientDatabaseError(error),
  };
}

function defaultDelay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function defaultRetryLogger(event: RetryLogEvent): void {
  console.warn("[database] transient read failed; retrying", event);
}

export async function executeWithTransientReadRetry<T>({
  model = "Unknown",
  operation,
  query,
  delay = defaultDelay,
  logRetry = defaultRetryLogger,
}: ExecuteWithTransientReadRetryOptions<T>): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (!isRetryableReadOperation(operation) || !isTransientDatabaseError(error)) {
      throw error;
    }

    logRetry({
      model,
      operation,
      code: getDatabaseErrorSummary(error).code,
      attempt: 1,
    });
    await delay(DATABASE_READ_RETRY_DELAY_MS);
    return query();
  }
}
