import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";
import { env } from "./env";

interface AuthResult {
  userId: string;
  username: string;
  isGuest: boolean;
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
      isGuest: false,
    };
  }

  // If cookie auth failed, try socket token auth (cross-origin)
  if (socketAuth?.token) {
    try {
      // Allow a separate shared secret for websocket servers deployed separately from the Next.js app.
      // This helps avoid prod-only failures when Vercel and Fly.io accidentally use different AUTH_SECRET values.
      const secret = new TextEncoder().encode(env.SOCKET_AUTH_SECRET ?? env.AUTH_SECRET);
      const { payload } = await jwtVerify(socketAuth.token, secret);
      
      if (typeof payload.userId === "string") {
        return {
          userId: payload.userId,
          username: (typeof payload.username === "string" && payload.username) || "Player",
          isGuest: payload.isGuest === true,
        };
      }
    } catch (error) {
      // Token verification failed (expired, invalid, etc.)
      console.error("[SocketAuth] Token verification failed:", error);
    }
  }

  return null;
}
