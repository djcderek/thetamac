"use client";

import { useSession, signOut } from "next-auth/react";
import posthog from "posthog-js";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  User,
  LogOut,
  Settings,
  BarChart3,
  CreditCard,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { getUpgradeUrl } from "@/lib/upgrade";
import {
  PROFILE_UPDATED_EVENT,
  type ProfileUpdatedDetail,
} from "@/lib/profile-events";

interface UserMenuProps {
  collapsed?: boolean;
}

export function UserMenu({ collapsed = false }: UserMenuProps) {
  const { data: session, status } = useSession();
  const sessionImage = session?.user?.image || undefined;
  const hasSessionUser = Boolean(session?.user);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    sessionImage
  );
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAvatar = async () => {
      if (!hasSessionUser) return;

      setAvatarUrl(sessionImage);

      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted) {
          setAvatarUrl(data?.profile?.image || sessionImage);
        }
      } catch (error) {
        console.error("Failed to load avatar", error);
      }
    };

    const handleProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ProfileUpdatedDetail>).detail;
      if (detail?.image !== undefined) {
        setAvatarUrl(detail.image || undefined);
      }
    };

    loadAvatar();
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    };
  }, [hasSessionUser, sessionImage]);

  const handleManageBilling = async () => {
    try {
      setBillingLoading(true);
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Unable to open billing portal.");
      }
      window.location.href = data.url;
    } catch (error) {
      console.error("Failed to open billing portal", error);
      alert(
        error instanceof Error
          ? error.message
          : "Unable to open billing portal."
      );
    } finally {
      setBillingLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />
        {!collapsed && (
          <div className="flex-1 space-y-1">
            <div className="h-3 w-20 bg-secondary rounded animate-pulse" />
            <div className="h-2 w-24 bg-secondary rounded animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className={collapsed ? "px-2" : "px-3"}>
        <Link href="/auth/signin">
          <Button
            variant="outline"
            size={collapsed ? "icon" : "sm"}
            className="w-full"
          >
            {collapsed ? <User className="h-4 w-4" /> : "Sign In"}
          </Button>
        </Link>
      </div>
    );
  }

  const initials = session.user.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : session.user.email?.[0]?.toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-3 w-full rounded-md hover:bg-secondary/50 transition-colors ${
            collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
          }`}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl || undefined} alt={session.user.name || "User"} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium truncate">{session.user.name || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {session.user.email}
              </p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{session.user.name || "User"}</p>
            <p className="text-xs text-muted-foreground">{session.user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {session.user.isPremium ? (
          <DropdownMenuItem
            onClick={handleManageBilling}
            className="cursor-pointer"
            disabled={billingLoading}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {billingLoading ? "Opening..." : "Manage billing"}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link
              href={getUpgradeUrl({ source: "user_menu" })}
              className="cursor-pointer text-primary"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/stats/performance" className="cursor-pointer">
            <BarChart3 className="mr-2 h-4 w-4" />
            My Stats
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/shop" className="cursor-pointer">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Shop
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            captureAnalyticsEvent(ANALYTICS_EVENTS.userSignedOut, {
              surface: "user_menu",
              auth_state: "authenticated",
            });
            posthog.reset();
            signOut({ callbackUrl: "/" });
          }}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
