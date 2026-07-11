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
import { PageHeader } from "@/components/ui/visual-system";

interface SettingToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

type SettingsState = {
  autoAdvance: boolean;
  defaultDifficulty: "Easy" | "Medium" | "Hard" | "Expert";
  defaultTimer: "5s" | "8s" | "10s" | "12s" | "15s" | "20s" | "30s";
};

const DIFFICULTY_OPTIONS: SettingsState["defaultDifficulty"][] = [
  "Easy",
  "Medium",
  "Hard",
  "Expert",
];
const PRACTICE_TIMER_OPTIONS: SettingsState["defaultTimer"][] = [
  "5s",
  "8s",
  "10s",
  "12s",
  "15s",
  "20s",
  "30s",
];

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
  const { theme, setTheme } = useTheme();
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<SaveFeedback>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [themeFeedback, setThemeFeedback] = useState<SaveFeedback>(null);
  const [settingsFeedback, setSettingsFeedback] = useState<SaveFeedback>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeHydratedFromServerRef = useRef(false);
  const themeChangedByUserRef = useRef(false);
  const themeSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const themeRequestVersionRef = useRef(0);
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
  
  // Temp avatar URL for editing
  const [tempAvatar, setTempAvatar] = useState("");
  const MAX_AVATAR_FILE_SIZE = 2 * 1024 * 1024; // 2MB limit for inline storage

  // Settings State
  const [settings, setSettings] = useState<SettingsState>({
    autoAdvance: true,
    defaultDifficulty: "Medium",
    defaultTimer: "10s"
  });
  const settingsRef = useRef(settings);

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

      setProfile((prev) => ({ ...prev, image }));

      await updateSession({ name: profile.name, image });
      setProfileFeedback({ type: "success", message: "Profile photo saved." });
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
      await updateSession({ name: savedName, image: profile.image });
      setProfileFeedback({ type: "success", message: "Profile saved." });
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

  const handleAvatarSave = async () => {
    if (!tempAvatar.trim()) {
      return;
    }
    const saved = await updateProfileImageValue(tempAvatar.trim());
    if (saved) {
      setIsAvatarDialogOpen(false);
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
      setAvatarError("Please choose an image smaller than 2MB.");
      event.target.value = "";
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      setAvatarError("Choose a PNG, JPEG, WebP, or GIF image.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result as string;
      await updateProfileImageValue(result);
    };
    reader.onerror = () => {
      console.error("Failed to read file");
      setAvatarError("Unable to read that image file.");
    };
    reader.readAsDataURL(file);

    event.target.value = "";
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
    <div className="min-h-screen">
      <PageHeader
        eyebrow="Make it yours"
        title="Settings"
        description="Manage your training, account, and appearance preferences."
      />

      <div className="p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileSelect}
              />

              <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile.image} referrerPolicy="no-referrer" />
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

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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

                  <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAvatarError(null);
                          setTempAvatar(profile.image || "");
                        }}
                      >
                        Use image URL
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Use Image URL</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex justify-center">
                          <Avatar className="h-20 w-20">
                            <AvatarImage src={tempAvatar} referrerPolicy="no-referrer" />
                            <AvatarFallback>Preview</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="avatar-url">Image URL</Label>
                          <Input
                            id="avatar-url"
                            placeholder="https://example.com/avatar.jpg"
                            value={tempAvatar}
                            onChange={(e) => setTempAvatar(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Paste a link to any image hosted online.
                          </p>
                          {avatarError && (
                            <p className="text-sm text-destructive" role="alert">
                              {avatarError}
                            </p>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAvatarDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAvatarSave} disabled={!tempAvatar.trim() || isUploadingAvatar}>
                          {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {isUploadingAvatar ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              {avatarError && !isAvatarDialogOpen && (
                <p className="text-sm text-destructive" role="alert">
                  {avatarError}
                </p>
              )}

              <Separator />

              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Display Name</label>
                  <Input 
                    value={profile.name} 
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    maxLength={80}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input 
                    value={profile.email} 
                    disabled
                    className="bg-muted text-muted-foreground opacity-100"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
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
                    className={`flex flex-col items-center gap-2 p-4 rounded-[3px] border transition-colors ${
                      theme === "light"
                        ? "border-foreground bg-secondary"
                        : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <Sun className="w-5 h-5" />
                    <span className="text-sm font-medium">Light</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={theme === "dark"}
                    onClick={() => updateTheme("dark")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-[3px] border transition-colors ${
                      theme === "dark"
                        ? "border-foreground bg-secondary"
                        : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <Moon className="w-5 h-5" />
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={theme === "system"}
                    onClick={() => updateTheme("system")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-[3px] border transition-colors ${
                      theme === "system"
                        ? "border-foreground bg-secondary"
                        : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <Monitor className="w-5 h-5" />
                    <span className="text-sm font-medium">System</span>
                  </button>
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
                onToggle={() => updateSettings({ autoAdvance: !settings.autoAdvance })}
              />
              <div className="pb-4">
                <FeedbackMessage feedback={settingsFeedback} />
              </div>
            </CardContent>
          </Card>

          {/* Training Defaults */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Training Defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Default Difficulty</label>
                <div className="flex gap-2">
                  {DIFFICULTY_OPTIONS.map((diff) => (
                    <Button
                      key={diff}
                      variant={settings.defaultDifficulty === diff ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSettings({ defaultDifficulty: diff })}
                    >
                      {diff}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Practice question timer</label>
                <p className="mb-2 text-xs text-muted-foreground">
                  Time allowed for each problem in Practice mode.
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRACTICE_TIMER_OPTIONS.map((time) => (
                    <Button
                      key={time}
                      variant={settings.defaultTimer === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSettings({ defaultTimer: time })}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
              <FeedbackMessage feedback={settingsFeedback} />
            </CardContent>
          </Card>

          {/* Legal & Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Legal & Feedback</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
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
