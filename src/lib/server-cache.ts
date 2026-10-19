import { createHash } from "crypto";
import { Redis } from "@upstash/redis";

// Short-lived cache for expensive, user-independent reads (leaderboard scans). Each server
// instance keeps values in memory; when Upstash is configured, values are also shared
// across instances. Redis failures fall back to loading, never to an error.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Keys are namespaced by the database they were computed from, so environments that share
// one Redis (dev, preview, production) never read each other's cached results.
const KEY_PREFIX = `cache:v1:${createHash("sha256")
  .update(process.env.DATABASE_URL ?? "")
  .digest("hex")
  .slice(0, 12)}:`;
const MAX_MEMORY_ENTRIES = 100;

type MemoryEntry = { value: unknown; expiresAt: number };
const memory = new Map<string, MemoryEntry>();
// Concurrent misses for the same key share one load instead of each scanning the tables.
const inFlight = new Map<string, Promise<unknown>>();

async function readRedis(key: string): Promise<MemoryEntry | null> {
  if (!redis) return null;
  try {
    return await redis.get<MemoryEntry>(KEY_PREFIX + key);
  } catch (error) {
    console.warn("[cache] redis read failed", key, error);
    return null;
  }
}

async function writeRedis(key: string, entry: MemoryEntry, ttlSeconds: number) {
  if (!redis) return;
  try {
    await redis.set(KEY_PREFIX + key, entry, { ex: ttlSeconds });
  } catch (error) {
    console.warn("[cache] redis write failed", key, error);
  }
}

function remember(key: string, entry: MemoryEntry) {
  if (memory.size >= MAX_MEMORY_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  memory.set(key, entry);
}

/**
 * Returns the cached value for `key`, or loads, caches and returns it. Values must be
 * JSON-serializable (no Dates or Maps), since they may round-trip through Redis.
 */
export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>
): Promise<T> {
  const hit = memory.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = (async () => {
    // The entry keeps its original expiry, so a shared hit never extends staleness.
    const shared = await readRedis(key);
    if (shared && shared.expiresAt > Date.now()) {
      remember(key, shared);
      return shared.value as T;
    }
    const entry: MemoryEntry = { value: await load(), expiresAt: Date.now() + ttlSeconds * 1000 };
    remember(key, entry);
    await writeRedis(key, entry, ttlSeconds);
    return entry.value as T;
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}
