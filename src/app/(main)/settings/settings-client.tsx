"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon, Monitor, Loader2, Shield, FileText, Mail, MessageSquarePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { FeatureRequestDialog } from "@/components/feature-request-dialog";
import { optionTileClass, PageHeader, SelectionPill } from "@/components/ui/visual-system";
import { PROFILE_UPDATED_EVENT } from "@/lib/profile-events";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import {
  captureAnalyticsEvent,
  hasOptedOutOfAnalytics,
  setAnalyticsOptOut,
} from "@/lib/analytics-client";

interface SettingToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

type SettingsState = {
  autoAdvance: boolean;
  defaultDifficulty: "Easy" | "Medium" | "Hard" | "Expert";
  defaultTimer: "off" | "5s" | "8s" | "10s" | "12s" | "15s" | "20s" | "30s";
};

const DIFFICULTY_OPTIONS: SettingsState["defaultDifficulty"][] = [
  "Easy",
  "Medium",
  "Hard",
  "Expert",
];
const PRACTICE_TIMER_OPTIONS: SettingsState["defaultTimer"][] = [
  "off",
  "5s",
  "8s",
  "10s",
  "12s",
  "15s",
  "20s",
  "30s",
];

const AVATAR_OUTPUT_SIZE = 512;

async function createSquareAvatar(file: File) {
  let source: CanvasImageSource;
  let width: number;
  let height: number;
  let cleanup: () => void = () => undefined;

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    source = bitmap;
    width = bitmap.width;
    height = bitmap.height;
    cleanup = () => bitmap.close();
  } else {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    source = image;
    width = image.naturalWidth;
    height = image.naturalHeight;
    cleanup = () => URL.revokeObjectURL(objectUrl);
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is unavailable.");
    }

    const cropSize = Math.min(width, height);
    const sourceX = (width - cropSize) / 2;
    const sourceY = (height - cropSize) / 2;
    context.drawImage(
      source,
      sourceX,
      sourceY,
      cropSize,
      cropSize,
      0,
      0,
      AVATAR_OUTPUT_SIZE,
      AVATAR_OUTPUT_SIZE
    );

    return canvas.toDataURL("image/webp", 0.9);
  } finally {
    cleanup();
  }
}

type SaveFeedback = { type: "success" | "error"; message: string } | null;

function FeedbackMessage({ feedback }: { feedback: SaveFeedback }) {
  if (!feedback) return null;
  return (
    <p
      className={feedback.type === "error" ? "text-sm text-destructive" : "text-sm text-success"}
      role={feedback.type === "error" ? "alert" : "status"}
    >
      {feedback.message}
    </p>
  );
}

async function getResponseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== "object") return fallback;

  const error = data as {
    error?: string;
    details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
  };
  const fieldMessage = Object.values(error.details?.fieldErrors ?? {}).flat()[0];
  return fieldMessage ?? error.details?.formErrors?.[0] ?? error.error ?? fallback;
}

function SettingToggle({ label, description, enabled, onToggle }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          enabled ? "bg-foreground" : "bg-secondary"
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-background transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsClient() {
  const { theme, setTheme, tone, setTone } = useTheme();
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<SaveFeedback>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [themeFeedback, setThemeFeedback] = useState<SaveFeedback>(null);
  const [settingsFeedback, setSettingsFeedback] = useState<SaveFeedback>(null);
  // Save feedback appears only in the card that triggered it; rendering it in both cards
  // showed it twice and made screen readers announce every save twice.
  const [settingsFeedbackSection, setSettingsFeedbackSection] = useState<"preferences" | "training">("preferences");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeHydratedFromServerRef = useRef(false);
  const themeChangedByUserRef = useRef(false);
  const toneHydratedFromServerRef = useRef(false);
  const toneChangedByUserRef = useRef(false);
  const themeSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const themeRequestVersionRef = useRef(0);
  const toneSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const toneRequestVersionRef = useRef(0);
  const settingsSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const settingsRequestVersionRef = useRef(0);
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const contactHref = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent("thetamac Support")}`
    : `mailto:?subject=${encodeURIComponent("thetamac Support")}`;

  // Profile State
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    image: ""
  });
  
  const MAX_AVATAR_FILE_SIZE = 8 * 1024 * 1024;

  // Settings State
  const [settings, setSettings] = useState<SettingsState>({
    autoAdvance: true,
    defaultDifficulty: "Medium",
    defaultTimer: "off"
  });
  const settingsRef = useRef(settings);

  useEffect(() => {
    setAnalyticsEnabled(!hasOptedOutOfAnalytics());
  }, []);

  // Fetch initial data
  useEffect(() => {
    if (sessionStatus === "loading") return;

    async function fetchData() {
      try {
        const res = await fetch("/api/settings");
        if (!res.ok) {
          throw new Error(await getResponseError(res, "Unable to load your saved settings."));
        }

        const data = await res.json();
        setProfile({
          name: data.profile.name || session?.user?.name || "",
          email: data.profile.email || session?.user?.email || "",
          image: data.profile.image || session?.user?.image || ""
        });
        const loadedSettings: SettingsState = {
          autoAdvance: data.settings.autoAdvance,
          defaultDifficulty: data.settings.defaultDifficulty,
          defaultTimer: data.settings.defaultTimer
        };
        settingsRef.current = loadedSettings;
        setSettings(loadedSettings);
        // Sync theme if it was stored in DB
        if (
          !themeHydratedFromServerRef.current &&
          !themeChangedByUserRef.current &&
          ["light", "dark", "system"].includes(data.settings.theme)
        ) {
          themeHydratedFromServerRef.current = true;
          setTheme(data.settings.theme);
        }
        if (
          !toneHydratedFromServerRef.current &&
          !toneChangedByUserRef.current &&
          ["warm", "neutral"].includes(data.settings.colorTone)
        ) {
          toneHydratedFromServerRef.current = true;
          setTone(data.settings.colorTone);
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
        setSettingsFeedback({
          type: "error",
          message:
            error instanceof Error ? error.message : "Unable to load your saved settings.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [
    session?.user?.email,
    session?.user?.image,
    session?.user?.name,
    sessionStatus,
    setTheme,
    setTone,
  ]);

  const updateProfileImageValue = async (image: string) => {
    setIsUploadingAvatar(true);
    setAvatarError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "profile",
          data: { image },
        }),
      });

      if (!res.ok) {
        throw new Error(await getResponseError(res, "Failed to update profile image."));
      }

      const data = await res.json();
      const savedImage = data.user?.image ?? image;
      setProfile((prev) => ({ ...prev, image: savedImage }));
      await updateSession({ name: profile.name });
      window.dispatchEvent(
        new CustomEvent(PROFILE_UPDATED_EVENT, {
          detail: { image: savedImage },
        })
      );
      router.refresh();
      setProfileFeedback({ type: "success", message: "Profile photo saved." });
      captureAnalyticsEvent(ANALYTICS_EVENTS.settingsSaved, {
        surface: "settings",
        setting_group: "profile_photo",
      });
      return true;
    } catch (error) {
      console.error("Failed to update profile image", error);
      setAvatarError(
        error instanceof Error ? error.message : "Failed to update profile image."
      );
      return false;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Update helper
  const updateSettings = (newSettings: Partial<SettingsState>) => {
    const previous = settingsRef.current;
    const updated = { ...previous, ...newSettings };
    const requestVersion = ++settingsRequestVersionRef.current;
    settingsRef.current = updated;
    setSettings(updated);
    setSettingsFeedback(null);

    settingsSaveQueueRef.current = settingsSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "settings",
            data: newSettings
          })
        });

        if (!response.ok) {
          throw new Error(await getResponseError(response, "Unable to save this setting."));
        }

        if (requestVersion === settingsRequestVersionRef.current) {
          setSettingsFeedback({ type: "success", message: "Settings saved." });
          captureAnalyticsEvent(ANALYTICS_EVENTS.settingsSaved, {
            surface: "settings",
            setting_group: "training_preferences",
            changed_fields: Object.keys(newSettings),
          });
        }
      })
      .catch((error) => {
        console.error("Failed to update settings", error);
        setSettings((current) => {
          const reverted = { ...current };
          for (const key of Object.keys(newSettings) as Array<keyof SettingsState>) {
            if (current[key] === newSettings[key]) {
              Object.assign(reverted, { [key]: previous[key] });
            }
          }
          settingsRef.current = reverted;
          return reverted;
        });
        if (requestVersion === settingsRequestVersionRef.current) {
          setSettingsFeedback({
            type: "error",
            message: error instanceof Error ? error.message : "Unable to save this setting.",
          });
        }
      });
  };

  const updateTheme = (newTheme: "light" | "dark" | "system") => {
    const previousTheme = theme;
    const requestVersion = ++themeRequestVersionRef.current;
    themeChangedByUserRef.current = true;
    setTheme(newTheme);
    setThemeFeedback(null);
    themeSaveQueueRef.current = themeSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "settings",
            data: { theme: newTheme }
          })
        });

        if (!response.ok) {
          throw new Error(await getResponseError(response, "Unable to save theme preference."));
        }

        if (requestVersion === themeRequestVersionRef.current) {
          setThemeFeedback({ type: "success", message: "Theme saved." });
          captureAnalyticsEvent(ANALYTICS_EVENTS.settingsSaved, {
            surface: "settings",
            setting_group: "appearance",
            changed_fields: ["theme"],
          });
        }
      })
      .catch((error) => {
        console.error("Failed to update theme preference", error);
        if (requestVersion === themeRequestVersionRef.current) {
          setTheme(previousTheme);
          setThemeFeedback({
            type: "error",
            message: error instanceof Error ? error.message : "Unable to save theme preference.",
          });
        }
      });
  };

  const updateTone = (newTone: "warm" | "neutral") => {
    const previousTone = tone;
    const requestVersion = ++toneRequestVersionRef.current;
    toneChangedByUserRef.current = true;
    setTone(newTone);
    setThemeFeedback(null);

    toneSaveQueueRef.current = toneSaveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "settings",
            data: { colorTone: newTone },
          }),
        });
        if (!response.ok) {
          throw new Error(
            await getResponseError(response, "Unable to save color preference.")
          );
        }
        if (requestVersion === toneRequestVersionRef.current) {
          setThemeFeedback({ type: "success", message: "Appearance saved." });
          captureAnalyticsEvent(ANALYTICS_EVENTS.settingsSaved, {
            surface: "settings",
            setting_group: "appearance",
            changed_fields: ["color_tone"],
          });
        }
      })
      .catch((error) => {
        console.error("Failed to update color preference", error);
        if (requestVersion === toneRequestVersionRef.current) {
          setTone(previousTone);
          setThemeFeedback({
            type: "error",
            message:
              error instanceof Error ? error.message : "Unable to save color preference.",
          });
        }
      });
  };

  const handleProfileSave = async () => {
    setIsSavingProfile(true);
    setProfileFeedback(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "profile",
          data: { name: profile.name },
        }),
      });

      if (!res.ok) {
        throw new Error(await getResponseError(res, "Failed to save your profile."));
      }

      const data = await res.json();
      const savedName = data.user?.name ?? profile.name.trim();
      setProfile((current) => ({ ...current, name: savedName }));
      await updateSession({ name: savedName });
      setProfileFeedback({ type: "success", message: "Profile saved." });
      captureAnalyticsEvent(ANALYTICS_EVENTS.settingsSaved, {
        surface: "settings",
        setting_group: "profile",
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to save profile", error);
      setProfileFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save your profile.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarFileSelect = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setAvatarError("Please choose an image smaller than 8MB.");
      event.target.value = "";
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      setAvatarError("Choose a PNG, JPEG, WebP, or GIF image.");
      event.target.value = "";
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError(null);
    try {
      const result = await createSquareAvatar(file);
      await updateProfileImageValue(result);
    } catch (error) {
      console.error("Failed to prepare avatar", error);
      setAvatarError("Unable to process that image. Please choose another photo.");
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE" || isDeletingAccount) return;

    setIsDeletingAccount(true);
    setDeleteAccountError(null);

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Unable to delete your account.");
      }

      localStorage.removeItem("thetamac-theme");
      localStorage.removeItem("thetamac-theme-tone");
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      setDeleteAccountError(
        error instanceof Error
          ? error.message
          : "Unable to delete your account. Please try again."
      );
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    if (isDeletingAccount) return;
    setIsDeleteDialogOpen(open);
    if (!open) {
      setDeleteConfirmation("");
      setDeleteAccountError(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="ph-no-capture min-h-screen">
      <PageHeader
        eyebrow="Make it yours"
        title="Settings"
        description="Manage your training, account, and appearance preferences."
      />

      <div className="p-4 md:p-6">
        <div className="max-w-2xl space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarFileSelect}
              />

              <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={profile.image || undefined}
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback>
                      {profile.name?.substring(0, 2).toUpperCase() || "User"}
                    </AvatarFallback>
                  </Avatar>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload photo"
                  )}
                </Button>
              </div>
              {avatarError && (
                <p className="text-sm text-destructive" role="alert">
                  {avatarError}
                </p>
              )}

              <Separator />

              <div className="grid gap-4">
                <div>
                  <label htmlFor="settings-display-name" className="text-sm font-medium mb-2 block">Display Name</label>
                  <Input 
                    id="settings-display-name"
                    value={profile.name} 
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    maxLength={80}
                  />
                </div>
                <div>
                  <label htmlFor="settings-email" className="text-sm font-medium mb-2 block">Email</label>
                  <Input 
                    id="settings-email"
                    value={profile.email} 
                    aria-describedby="settings-email-help"
                    disabled
                    className="bg-muted text-muted-foreground opacity-100"
                  />
                  <p id="settings-email-help" className="text-xs text-muted-foreground mt-1">
                    Email address cannot be changed.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleProfileSave} disabled={isSavingProfile || !profile.name.trim()}>
                  {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
              <FeedbackMessage feedback={profileFeedback} />
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Choose your preferred theme
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    aria-pressed={theme === "light"}
                    onClick={() => updateTheme("light")}
                    className={optionTileClass(theme === "light", "flex flex-col items-center gap-2 p-4", { slidingPill: true })}
                  >
                    {theme === "light" && <SelectionPill group="settings-theme" />}
                    <Sun className="w-5 h-5" />
                    <span className="text-sm font-medium">Light</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={theme === "dark"}
                    onClick={() => updateTheme("dark")}
                    className={optionTileClass(theme === "dark", "flex flex-col items-center gap-2 p-4", { slidingPill: true })}
                  >
                    {theme === "dark" && <SelectionPill group="settings-theme" />}
                    <Moon className="w-5 h-5" />
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={theme === "system"}
                    onClick={() => updateTheme("system")}
                    className={optionTileClass(theme === "system", "flex flex-col items-center gap-2 p-4", { slidingPill: true })}
                  >
                    {theme === "system" && <SelectionPill group="settings-theme" />}
                    <Monitor className="w-5 h-5" />
                    <span className="text-sm font-medium">System</span>
                  </button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Color tone</p>
                    <p className="text-xs text-muted-foreground">
                      Choose the original warm palette or quieter neutral surfaces.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      aria-pressed={tone === "warm"}
                      onClick={() => updateTone("warm")}
                      className={optionTileClass(tone === "warm", "flex items-center gap-3 p-3 text-left", { slidingPill: true })}
                    >
                      {tone === "warm" && <SelectionPill group="settings-tone" />}
                      <span className="h-5 w-5 rounded-full border border-border bg-[oklch(0.92_0.045_65)]" />
                      <span className="text-sm font-medium">Warm</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={tone === "neutral"}
                      onClick={() => updateTone("neutral")}
                      className={optionTileClass(tone === "neutral", "flex items-center gap-3 p-3 text-left", { slidingPill: true })}
                    >
                      {tone === "neutral" && <SelectionPill group="settings-tone" />}
                      <span className="h-5 w-5 rounded-full border border-border bg-[oklch(0.92_0.004_260)]" />
                      <span className="text-sm font-medium">Neutral</span>
                    </button>
                  </div>
                </div>
                <FeedbackMessage feedback={themeFeedback} />
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <SettingToggle
                label="Auto-advance"
                description="Automatically show the next problem after each result"
                enabled={settings.autoAdvance}
                onToggle={() => {
                  setSettingsFeedbackSection("preferences");
                  updateSettings({ autoAdvance: !settings.autoAdvance });
                }}
              />
              {settingsFeedbackSection === "preferences" && (
                <div className="pb-4">
                  <FeedbackMessage feedback={settingsFeedback} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Training Defaults */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Training Defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p id="default-difficulty-label" className="text-sm font-medium mb-2 block">Default Difficulty</p>
                <div role="group" aria-labelledby="default-difficulty-label" className="flex gap-2">
                  {DIFFICULTY_OPTIONS.map((diff) => (
                    <Button
                      key={diff}
                      variant="secondary"
                      size="sm"
                      className={`relative isolate capitalize ${settings.defaultDifficulty === diff ? "text-background hover:bg-control" : ""}`}
                      aria-pressed={settings.defaultDifficulty === diff}
                      onClick={() => {
                        setSettingsFeedbackSection("training");
                        updateSettings({ defaultDifficulty: diff });
                      }}
                    >
                      {settings.defaultDifficulty === diff && <SelectionPill group="settings-difficulty" className="rounded-full" />}
                      {diff}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p id="practice-timer-label" className="text-sm font-medium mb-1 block">Practice question timer</p>
                <p id="practice-timer-help" className="mb-2 text-xs text-muted-foreground">
                  Time allowed for each problem in Practice mode. Off lets you take as long as you need.
                </p>
                <div
                  role="group"
                  aria-labelledby="practice-timer-label"
                  aria-describedby="practice-timer-help"
                  className="flex flex-wrap gap-2"
                >
                  {PRACTICE_TIMER_OPTIONS.map((time) => (
                    <Button
                      key={time}
                      variant="secondary"
                      size="sm"
                      className={`relative isolate capitalize ${settings.defaultTimer === time ? "text-background hover:bg-control" : ""}`}
                      aria-pressed={settings.defaultTimer === time}
                      onClick={() => {
                        setSettingsFeedbackSection("training");
                        updateSettings({ defaultTimer: time });
                      }}
                    >
                      {settings.defaultTimer === time && <SelectionPill group="settings-timer" className="rounded-full" />}
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
              {settingsFeedbackSection === "training" && (
                <FeedbackMessage feedback={settingsFeedback} />
              )}
            </CardContent>
          </Card>

          {/* Legal & Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Legal & Feedback</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <SettingToggle
                label="Product analytics"
                description="Help improve thetamac with masked usage analytics and session replay"
                enabled={analyticsEnabled}
                onToggle={() => {
                  const nextEnabled = !analyticsEnabled;
                  setAnalyticsEnabled(nextEnabled);
                  setAnalyticsOptOut(!nextEnabled);
                }}
              />
              <div className="flex items-center justify-between py-4 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Privacy Policy</p>
                    <p className="text-sm text-muted-foreground">How we handle your data</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/privacy">View</Link>
                </Button>
              </div>

              <div className="flex items-center justify-between py-4 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Terms of Service</p>
                    <p className="text-sm text-muted-foreground">Rules and usage terms</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/terms">View</Link>
                </Button>
              </div>

              <div className="flex items-center justify-between py-4 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Contact</p>
                    <p className="text-sm text-muted-foreground">Get help or ask a question</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={contactHref}>Email</a>
                </Button>
              </div>

              <div className="flex items-center justify-between py-4 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <MessageSquarePlus className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Feature Request</p>
                    <p className="text-sm text-muted-foreground">Tell us what you want next</p>
                  </div>
                </div>
                <FeatureRequestDialog triggerLabel="Send" />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and data
                  </p>
                </div>
                <Dialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">Delete</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete your account?</DialogTitle>
                      <DialogDescription>
                        This permanently deletes your profile, training history, statistics,
                        cosmetics, and multiplayer records. Any active subscription will be
                        cancelled immediately. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 py-2">
                      <Label htmlFor="delete-account-confirmation">
                        Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm
                      </Label>
                      <Input
                        id="delete-account-confirmation"
                        value={deleteConfirmation}
                        onChange={(event) => setDeleteConfirmation(event.target.value)}
                        autoComplete="off"
                        disabled={isDeletingAccount}
                      />
                      {deleteAccountError && (
                        <p className="text-sm text-destructive" role="alert">
                          {deleteAccountError}
                        </p>
                      )}
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDeleteDialogChange(false)}
                        disabled={isDeletingAccount}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmation !== "DELETE" || isDeletingAccount}
                      >
                        {isDeletingAccount ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Permanently delete account"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
