import { getToken } from "next-auth/jwt";
import { env } from "./env";

interface AuthResult {
  userId: string;
  username: string;
}

interface SocketAuth {
  userId?: string;
  username?: string;
}

export async function authenticateSocket(
  cookieHeader: string | undefined,
  socketAuth?: SocketAuth
): Promise<AuthResult | null> {
  // First try cookie-based auth (same-origin)
  const token = await getToken({
    req: { headers: { cookie: cookieHeader ?? "" } } as never,
    secret: env.AUTH_SECRET,
  });

  let userId = typeof token?.id === "string" ? token.id : null;
  let username = (typeof token?.name === "string" && token.name) || "Player";

  // If cookie auth failed, try socket auth (cross-origin)
  if (!userId && socketAuth?.userId) {
    userId = socketAuth.userId;
    username = socketAuth.username || "Player";
  }

  if (!userId) {
    return null;
  }

  return { userId, username };
}
