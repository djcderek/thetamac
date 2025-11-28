import { auth } from "./auth";
import { db } from "./db";
import { cache } from "react";

/**
 * Get the current session on the server
 * This is cached per request to avoid multiple DB calls
 */
export const getSession = cache(async () => {
  const session = await auth();
  return session;
});

/**
 * Get the current user from the database with full data
 * Cached per request for performance
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  
  if (!session?.user?.id) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      stats: true,
    },
  });

  return user;
});

/**
 * Check if user is authenticated
 * Use this for simple auth checks
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session?.user;
}

/**
 * Require authentication or throw
 * Use this in server components/actions that require auth
 */
export async function requireAuth() {
  const session = await getSession();
  
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  
  return session;
}

/**
 * Get the current user ID
 * Returns null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}

