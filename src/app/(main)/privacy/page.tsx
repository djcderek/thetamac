import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how thetamac collects, uses, and protects your personal information. Read our privacy policy for details on data handling practices.",
  openGraph: {
    title: "Privacy Policy | thetamac",
    description: "Privacy Policy for the thetamac mental math training platform.",
  },
};

export default function PrivacyPolicyPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const contactHref = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent("thetamac Privacy")}`
    : `mailto:?subject=${encodeURIComponent("thetamac Privacy")}`;

  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="px-5 py-6 md:px-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-normal tracking-tight">Privacy Policy</h1>
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
                thetamac is a mental math training platform with features like practice/training
                sessions, performance stats, leaderboards, multiplayer/racing modes, and (optional)
                paid subscriptions.
              </p>
              <p className="text-sm text-muted-foreground">
                This policy explains what we collect, how we use it, and what choices you have.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Information we collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Account information</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>
                    If you create an account via Google sign-in, we receive your email address, name,
                    and profile image from Google.
                  </li>
                  <li>
                    You may also update certain profile fields in Settings (e.g., your display name
                    and profile image).
                  </li>
                  <li>
                    We store account settings/preferences you choose (for example: theme, sound
                    effects, notifications, auto-advance, default difficulty, and default timer).
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Training, gameplay, and stats</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>
                    Training session configuration and results (e.g., difficulty, operations, problems
                    attempted, accuracy, streaks, timing).
                  </li>
                  <li>
                    Per-problem attempt data for performance analysis (e.g., operands, operation,
                    correct answer, your submitted answer, correctness, time taken).
                  </li>
                  <li>
                    Multiplayer and racing match data needed to run and review games (e.g., rounds,
                    scores, timings, match status, and race events).
                  </li>
                  <li>Leaderboard-related stats derived from your activity (e.g., rating/rank).</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Shop and cosmetics</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>In-app currency balance and items you purchase/unlock.</li>
                  <li>Cosmetic selections (e.g., equipped skin/trail/vehicle).</li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Guest mode</p>
                <p className="text-sm text-muted-foreground">
                  If you use the app without signing in, we create a guest identifier and guest name
                  and store them in an <span className="font-medium">HTTP-only cookie</span> on your
                  device. This lets the app remember your guest session (the guest cookie is intended
                  to last about 7 days). If you submit a guest score to a guest leaderboard, we store
                  the guest name and score.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Billing information (subscriptions)</p>
                <p className="text-sm text-muted-foreground">
                  If you subscribe, payments are processed by Stripe. We store limited billing-related
                  fields such as your Stripe customer ID, subscription ID, subscription status/plan,
                  and renewal date. We do <span className="font-medium">not</span> store your full card
                  number.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Usage analytics, logs, and diagnostics</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>
                    We use Vercel Analytics to understand traffic and improve the product. Vercel may
                    process basic device and usage information (for example, page views).
                  </li>
                  <li>
                    We use PostHog for product analytics, privacy-masked session replay, error
                    diagnostics, surveys, feature flags, and experiments. This can include page
                    visits, feature usage, training milestones, device/browser information, and
                    interaction patterns. Training answers, profile fields, and billing details are
                    excluded from replay and analytics event properties.
                  </li>
                  <li>
                    Like most online services, our infrastructure may generate server logs that can
                    include IP address, user agent, timestamps, and requested URLs.
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Feedback and messages</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>
                    If you send a feature request from Settings, we store your message and (if signed
                    in) your account email so we can follow up and prioritize requests.
                  </li>
                  <li>
                    If you contact us, we receive the contents of your message and any information you
                    choose to share.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">How we use information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>Provide and operate the app (accounts, training, multiplayer/racing, leaderboards).</li>
                <li>Personalize your experience (settings, cosmetics, premium access).</li>
                <li>Process subscriptions and manage billing through Stripe.</li>
                <li>Maintain security, prevent abuse, and debug issues.</li>
                <li>Improve features and product decisions using aggregated analytics/telemetry.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">How we share information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                We share information with service providers that help us run the app, for example:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>
                  <span className="font-medium">Google</span> (authentication): to let you sign in with
                  Google.
                </li>
                <li>
                  <span className="font-medium">Stripe</span> (payments): to process subscriptions and
                  manage billing.
                </li>
                <li>
                  <span className="font-medium">Vercel</span> (hosting/analytics): to host the app and
                  provide analytics.
                </li>
                <li>
                  <span className="font-medium">PostHog</span> (product analytics): to understand
                  feature usage, diagnose interaction problems, collect optional survey responses,
                  and evaluate product improvements.
                </li>
                <li>
                  <span className="font-medium">Upstash</span> (rate limiting, if enabled): to help
                  prevent abuse by tracking request counts for an identifier (such as a user ID or
                  email).
                </li>
                <li>
                  <span className="font-medium">Hosting providers for real-time features</span>: if you
                  use multiplayer/racing, a separate Socket.io server may handle real-time gameplay
                  traffic (for example, answers and actions) and may be hosted on an infrastructure
                  provider distinct from the main web app.
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                We may also share information if required to comply with law or to protect the rights,
                safety, and security of the app and its users. We do not sell your personal
                information.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Cookies and similar technologies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>
                  <span className="font-medium">Authentication cookies/tokens</span>: used by NextAuth
                  to keep you signed in.
                </li>
                <li>
                  <span className="font-medium">Guest cookie</span>: if you use the app as a guest, an
                  HTTP-only cookie stores a signed guest token so we can recognize your guest session.
                </li>
                <li>
                  <span className="font-medium">Socket authentication token</span>: to connect to the
                  multiplayer/racing server across origins, the app may fetch a short-lived token and
                  send it as part of the socket connection handshake.
                </li>
                <li>
                  <span className="font-medium">Preferences</span>: your theme preference is stored in
                  your browser (local storage) and, if you’re signed in, may also be saved to your
                  account settings.
                </li>
                <li>
                  <span className="font-medium">Product analytics preference</span>: your browser
                  stores whether you have opted out of PostHog analytics and session replay. Analytics
                  are enabled by default, inputs are masked, and URL query strings are removed from
                  recordings.
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                You can disable product analytics from Settings at any time. You can also control
                cookies through your browser settings. If you block certain cookies, parts of the app
                (like sign-in) may not work.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Data retention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                We keep personal information for as long as needed to provide the service, comply with
                legal obligations, resolve disputes, and enforce our agreements.
              </p>
              <p className="text-sm text-muted-foreground">
                Training and match history is generally retained to power your stats and leaderboards.
                You can request deletion of your account by contacting us.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Your choices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li>Update certain profile information in Settings.</li>
                <li>Manage your subscription via the Stripe billing portal (if subscribed).</li>
                <li>Control cookies and local storage via your browser settings.</li>
                <li>Contact us to request access, correction, or deletion of your data.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Children’s privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                thetamac is not directed to children under 13, and we do not knowingly collect
                personal information from children under 13. If you believe a child has provided
                personal information, please contact us so we can delete it.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Changes to this policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                We may update this policy from time to time. We’ll post the latest version on this
                page and update the “Last updated” date above.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Questions or requests related to privacy? Contact us at{" "}
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
