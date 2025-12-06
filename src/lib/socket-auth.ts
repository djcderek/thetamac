import { getToken } from "next-auth/jwt";
import { env } from "./env";

interface AuthResult {
  userId: string;
  username: string;
}

export async function authenticateSocket(
  cookieHeader: string | undefined
): Promise<AuthResult | null> {
  const token = await getToken({
    req: { headers: { cookie: cookieHeader ?? "" } } as never,
    secret: env.AUTH_SECRET,
  });

  const userId = typeof token?.id === "string" ? token.id : null;
  const username =
    (typeof token?.name === "string" && token.name) || "Player";

  if (!userId) {
    return null;
  }

  return { userId, username };
}
