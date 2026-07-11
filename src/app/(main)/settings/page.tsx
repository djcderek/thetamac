import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your thetamac account preferences, profile, and training defaults.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/auth/signin?callbackUrl=%2Fsettings");
  }

  return <SettingsClient />;
}
