import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import { db } from "./db";
import type { Adapter } from "next-auth/adapters";
import { isPremiumStatus } from "./subscription";
import { SubscriptionPlan } from "@prisma/client";
import { env } from "./env";

const TRANSIENT_DATABASE_ERROR_CODES = new Set(["P1001", "P1002", "P1017"]);
const AUTH_DATABASE_RETRY_DELAY_MS = 150;

function isTransientDatabaseError(error: unknown) {
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
  return (
    message.includes("connection") &&
    (message.includes("closed") ||
      message.includes("timed out") ||
      message.includes("can't reach database"))
  );
}

function getDatabaseErrorSummary(error: unknown) {
  if (!error || typeof error !== "object") {
    return { code: "UNKNOWN", transient: false };
  }

  const candidate = error as { code?: unknown };
  return {
    code: typeof candidate.code === "string" ? candidate.code : "UNKNOWN",
    transient: isTransientDatabaseError(error),
  };
}

async function loadBillingUser(userId: string) {
  const query = () =>
    db.user.findUnique({
      where: { id: userId },
      select: {
        isPremium: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        subscriptionCurrentPeriodEnd: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

  try {
    return await query();
  } catch (error) {
    if (!isTransientDatabaseError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, AUTH_DATABASE_RETRY_DELAY_MS));
    return query();
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db) as Adapter,
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  theme: {
    // Used by NextAuth's built-in auth pages (e.g. during OAuth redirects/errors).
    logo: "/icon.svg",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session, account, profile }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        
        // If signing in with OAuth (like Google), update the user record in DB to ensure we have the latest image/name
        if (account?.provider === "google") {
           try {
             // We can't use 'db' directly inside the edge runtime if this was edge, 
             // but this is nodejs runtime so it's fine.
             // However, to be safe and strictly follow NextAuth patterns, 
             // usually the adapter handles user creation/updates.
             // But sometimes the image URL expires or changes on the provider side.
             
             // Force update user info from profile if available
             if (profile) {
               // profile.picture for Google, profile.avatar_url for GitHub typically
               const image =
                 getProfileString(profile, "picture") ||
                 getProfileString(profile, "avatar_url") ||
                 user.image;
               const name =
                 getProfileString(profile, "name") || user.name;
               
               // Update token immediately
               token.picture = image;
               token.name = name;
             }
           } catch (e) {
             console.error("Error updating user info in JWT callback", e);
           }
        }
      }

      // Handle update trigger (e.g., after profile update)
      if (trigger === "update" && session) {
        const profileUpdate = session as typeof session & {
          name?: unknown;
          image?: unknown;
          user?: { name?: unknown; image?: unknown };
        };
        const updatedName = profileUpdate.name ?? profileUpdate.user?.name;
        const updatedImage = profileUpdate.image ?? profileUpdate.user?.image;

        if (typeof updatedName === "string") {
          token.name = updatedName;
        }
        if (typeof updatedImage === "string") {
          token.picture = updatedImage.startsWith("data:image/") ? null : updatedImage;
        }
      }

      // Inline avatar data is persisted in the profile, not in the JWT cookie.
      // User-facing avatar components load the current database value separately.
      if (typeof token.picture === "string" && token.picture.startsWith("data:image/")) {
        token.picture = null;
      }

      const userId = (user?.id as string) ?? (token.id as string | undefined);

      if (userId) {
        try {
          const billingUser = await loadBillingUser(userId);

          if (billingUser) {
            const premiumStatus =
              billingUser.isPremium ||
              isPremiumStatus(billingUser.subscriptionStatus);

            token.isPremium = premiumStatus;
            token.subscriptionStatus = billingUser.subscriptionStatus;
            token.subscriptionPlan = billingUser.subscriptionPlan;
            token.subscriptionCurrentPeriodEnd =
              billingUser.subscriptionCurrentPeriodEnd?.toISOString() ?? null;
            token.stripeCustomerId = billingUser.stripeCustomerId;
            token.stripeSubscriptionId = billingUser.stripeSubscriptionId;
          }
        } catch (error) {
          // Billing metadata is auxiliary to identity. Preserve any values already
          // in the token instead of failing an otherwise valid sign-in/session.
          console.error(
            "Unable to refresh billing metadata during authentication",
            getDatabaseErrorSummary(error)
          );
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = (token.picture as string | null | undefined) ?? null;
        session.user.isPremium = Boolean(token.isPremium);
        session.user.subscriptionStatus =
          (token.subscriptionStatus as string | null) ?? null;
        session.user.subscriptionPlan =
          (token.subscriptionPlan as SubscriptionPlan | null) ?? null;
        (session.user as { subscriptionCurrentPeriodEnd: string | null }).subscriptionCurrentPeriodEnd =
          token.subscriptionCurrentPeriodEnd ?? null;
        session.user.stripeCustomerId =
          (token.stripeCustomerId as string | null) ?? null;
        session.user.stripeSubscriptionId =
          (token.stripeSubscriptionId as string | null) ?? null;
      }
      return session;
    },
    async signIn({ account }) {
      if (account?.provider === "google") {
        return true;
      }
      return false;
    },
  },
  events: {
    async createUser({ user }) {
      // Initialize user stats when a new user is created
      if (user.id) {
        await db.userStats.create({
          data: {
            userId: user.id,
          },
        });
      }
    },
  },
  // Trust host headers - required for OAuth redirects and behind reverse proxies
  trustHost: true,
});

function getProfileString(
  profile: unknown,
  key: string
): string | undefined {
  if (!profile || typeof profile !== "object") {
    return undefined;
  }
  const value = (profile as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
