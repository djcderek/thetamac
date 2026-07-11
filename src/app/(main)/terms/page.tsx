import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the thetamac Terms of Service. Understand your rights and responsibilities when using our mental math training platform.",
  openGraph: {
    title: "Terms of Service | thetamac",
    description: "Terms of Service for the thetamac mental math training platform.",
  },
};

export default function TermsOfServicePage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const contactHref = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent("thetamac Terms")}`
    : `mailto:?subject=${encodeURIComponent("thetamac Terms")}`;

  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="px-5 py-6 md:px-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-normal tracking-tight">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: Dec 19, 2025</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings">Back to Settings</Link>
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                These Terms of Service (“Terms”) govern your use of the thetamac website and services
                (the “Service”), including training modes, leaderboards, multiplayer/racing features,
                the in-app shop, and subscriptions.
              </p>
              <p className="text-sm text-muted-foreground">
                By accessing or using the Service, you agree to these Terms and our{" "}
                <Link className="underline underline-offset-2" href="/privacy">
                  Privacy Policy
                </Link>
                . If you do not agree, do not use the Service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Eligibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>You must be at least 13 years old to use the Service.</li>
                  <li>
                    If you use the Service on behalf of an organization, you represent that you have
                    authority to bind that organization to these Terms.
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Accounts and guest mode</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>
                    You may use the Service as a guest or by signing in with Google. If you create an
                    account, you are responsible for all activity that occurs under your account.
                  </li>
                  <li>
                    You agree not to share access in a way that allows others to impersonate you or
                    misuse the Service.
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Acceptable use and fair play</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>
                    Do not abuse, disrupt, or attempt to break the Service (including the multiplayer
                    or racing servers).
                  </li>
                  <li>
                    Do not cheat, automate gameplay, exploit bugs, manipulate leaderboards/ratings,
                    or interfere with other users’ gameplay.
                  </li>
                  <li>
                    Do not attempt to reverse engineer or bypass access controls, rate limits, or
                    authentication mechanisms.
                  </li>
                  <li>Be respectful to other players and do not harass others.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">User submissions</p>
                <p className="text-sm text-muted-foreground">
                  If you submit feedback (for example, feature requests), you grant us permission to
                  use it to operate, improve, and promote the Service without restriction or
                  obligation to you.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Subscriptions, billing, and trials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Some features require a paid subscription (“Pro”). Subscriptions are processed by
                Stripe and may renew automatically unless cancelled. Pricing, taxes, and renewal terms
                are shown at checkout.
              </p>
              <p className="text-sm text-muted-foreground">
                If we offer a free trial, eligibility and duration may vary and may be limited to one
                per user. Trials convert to paid subscriptions unless cancelled before the trial ends.
              </p>
              <p className="text-sm text-muted-foreground">
                Manage or cancel your subscription through the Stripe billing portal available from
                Settings (when applicable).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Virtual items, coins, and shop</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The Service may include virtual currency (“coins”) and virtual items (such as cosmetic
                skins/trails/vehicles/wheels). Coins and items are for entertainment purposes only,
                have no cash value, and are not redeemable for money.
              </p>
              <p className="text-sm text-muted-foreground">
                We may change, rebalance, add, or remove virtual items, prices, eligibility (including
                Pro-only items), and coin grants at any time. Where permitted by law, we may also
                modify or discontinue the shop.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Service availability and changes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                We work to keep the Service available, but we do not guarantee that it will be
                uninterrupted or error-free. Multiplayer/racing features may rely on separate
                real-time servers and can be affected by network conditions.
              </p>
              <p className="text-sm text-muted-foreground">
                We may modify, suspend, or discontinue any part of the Service at any time, including
                features, leaderboards, ratings, and game modes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                We may suspend or terminate access to the Service if you violate these Terms, attempt
                to cheat or abuse the Service, or pose a risk to other users or to the Service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Disclaimers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The Service is provided “as is” and “as available.” To the fullest extent permitted by
                law, we disclaim all warranties, express or implied, including warranties of
                merchantability, fitness for a particular purpose, and non-infringement.
              </p>
              <p className="text-sm text-muted-foreground">
                thetamac is for training/entertainment and does not provide educational, medical, or
                professional advice.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Limitation of liability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                To the fullest extent permitted by law, thetamac and its operators will not be liable
                for indirect, incidental, special, consequential, or punitive damages, or any loss of
                data, profits, or goodwill, arising from or related to your use of the Service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Changes to these Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                We may update these Terms from time to time. The latest version will be posted on this
                page and the “Last updated” date will be revised.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Questions about these Terms? Contact us at{" "}
                {supportEmail ? (
                  <a className="underline underline-offset-2" href={contactHref}>
                    {supportEmail}
                  </a>
                ) : (
                  <a className="underline underline-offset-2" href={contactHref}>
                    email us
                  </a>
                )}
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
