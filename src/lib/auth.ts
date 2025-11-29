import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { Provider } from "next-auth/providers";
import { isPremiumStatus } from "./subscription";

// Build providers array dynamically based on available credentials
const providers: Provider[] = [
  // Credentials Provider for email/password (always available)
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Email and password are required");
      }

      const email = credentials.email as string;
      const password = credentials.password as string;

      // Find user by email
      const user = await db.user.findUnique({
        where: { email },
      });

      if (!user || !user.password) {
        throw new Error("Invalid email or password");
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        throw new Error("Invalid email or password");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

// Only add OAuth providers if credentials are configured
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: process.env.AUTH_SECRET || "development-secret-change-in-production",
  session: {
    strategy: "jwt", // Use JWT for credentials provider compatibility
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers,
  callbacks: {
    async jwt({ token, user, trigger, session, account, profile }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        
        // If signing in with OAuth (like Google), update the user record in DB to ensure we have the latest image/name
        if (account?.provider === "google" || account?.provider === "github") {
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
          (token.subscriptionPlan as string | null) ?? null;
        session.user.subscriptionCurrentPeriodEnd =
          (token.subscriptionCurrentPeriodEnd as string | null) ?? null;
        session.user.stripeCustomerId =
          (token.stripeCustomerId as string | null) ?? null;
        session.user.stripeSubscriptionId =
          (token.stripeSubscriptionId as string | null) ?? null;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Allow OAuth without email verification
      if (account?.provider !== "credentials") {
        // The PrismaAdapter handles user creation/update automatically
        // We just need to allow the sign in to proceed
        return true;
      }

      // For credentials, ensure email exists
      if (!user.email) {
        return false;
      }

      return true;
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
  trustHost: true,
});

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Helper function to verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

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
