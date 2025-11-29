import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY. Add it to your environment to enable billing."
    );
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2023-10-16",
    appInfo: {
      name: "thetamac",
    },
  });

  return stripeClient;
}

