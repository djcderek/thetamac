import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";
import { env } from "./env";

interface AuthResult {
  userId: string;
  username: string;
}

interface SocketAuth {
  token?: string;
}

export async function authenticateSocket(
  cookieHeader: string | undefined,
  socketAuth?: SocketAuth
): Promise<AuthResult | null> {
  // First try cookie-based auth (same-origin)
  const sessionToken = await getToken({
    req: { headers: { cookie: cookieHeader ?? "" } } as never,
    secret: env.AUTH_SECRET,
  });

  if (sessionToken?.id && typeof sessionToken.id === "string") {
    return {
      userId: sessionToken.id,
      username: (typeof sessionToken.name === "string" && sessionToken.name) || "Player",
    };
  }

  // If cookie auth failed, try socket token auth (cross-origin)
  if (socketAuth?.token) {
    try {
      const secret = new TextEncoder().encode(env.AUTH_SECRET);
      const { payload } = await jwtVerify(socketAuth.token, secret);
      
      if (typeof payload.userId === "string") {
        return {
          userId: payload.userId,
          username: (typeof payload.username === "string" && payload.username) || "Player",
        };
      }
    } catch (error) {
      // Token verification failed (expired, invalid, etc.)
      console.error("[SocketAuth] Token verification failed:", error);
    }
  }

  return null;
}
