import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import { db } from "./db";
import type { Adapter } from "next-auth/adapters";
import { isPremiumStatus } from "./subscription";
import { SubscriptionPlan } from "@prisma/client";
import { env } from "./env";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db) as Adapter,
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
        token.name = session.name;
        token.picture = session.image;
      }

      const userId = (user?.id as string) ?? (token.id as string | undefined);

      if (userId) {
        const billingUser = await db.user.findUnique({
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
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
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
  // Trust host headers - required when behind a reverse proxy (Vercel, Fly.io, etc.)
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
