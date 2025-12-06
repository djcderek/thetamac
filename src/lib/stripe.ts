import Stripe from "stripe";
import { env } from "./env";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = env.STRIPE_SECRET_KEY;

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    appInfo: {
      name: "thetamac",
    },
  });

  return stripeClient;
}



