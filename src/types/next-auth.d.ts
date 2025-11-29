import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
import { SubscriptionPlan } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image: string;
      isPremium: boolean;
      subscriptionStatus: string | null;
      subscriptionPlan: SubscriptionPlan | null;
      subscriptionCurrentPeriodEnd: string | null;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
    };
  }

  interface User extends DefaultUser {
    id: string;
    isPremium: boolean;
    subscriptionStatus: string | null;
    subscriptionPlan: SubscriptionPlan | null;
    subscriptionCurrentPeriodEnd: Date | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    isPremium?: boolean;
    subscriptionStatus?: string | null;
    subscriptionPlan?: SubscriptionPlan | null;
    subscriptionCurrentPeriodEnd?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  }
}


