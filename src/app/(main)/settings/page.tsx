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
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface SettingToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

function SettingToggle({ label, description, enabled, onToggle }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
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

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const contactHref = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent("thetamac Support")}`
    : `mailto:?subject=${encodeURIComponent("thetamac Support")}`;
  const [isFeatureRequestDialogOpen, setIsFeatureRequestDialogOpen] = useState(false);
  const [featureRequestMessage, setFeatureRequestMessage] = useState("");
  const [isSubmittingFeatureRequest, setIsSubmittingFeatureRequest] = useState(false);
  const [featureRequestError, setFeatureRequestError] = useState<string | null>(null);

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
  const [settings, setSettings] = useState({
    soundEnabled: true,
    notificationsEnabled: true,
    autoAdvance: true,
    defaultDifficulty: "Medium",
    defaultTimer: "10s"
  });

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setProfile({
            name: data.profile.name || session?.user?.name || "",
            email: data.profile.email || session?.user?.email || "",
            image: data.profile.image || session?.user?.image || ""
          });
          setSettings({
            soundEnabled: data.settings.soundEnabled,
            notificationsEnabled: data.settings.notificationsEnabled,
            autoAdvance: data.settings.autoAdvance,
            defaultDifficulty: data.settings.defaultDifficulty,
            defaultTimer: data.settings.defaultTimer
          });
          // Sync theme if it was stored in DB
          if (data.settings.theme && data.settings.theme !== theme) {
            setTheme(data.settings.theme);
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [session, theme, setTheme]);

  const updateProfileImageValue = async (image: string) => {
    setIsUploadingAvatar(true);
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
        throw new Error("Failed to update profile image");
      }

      setProfile((prev) => ({ ...prev, image }));

      await updateSession({
        ...session,
        user: {
          ...session?.user,
          image,
        },
      });
    } catch (error) {
      console.error("Failed to update profile image", error);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Update helper
  const updateSettings = async (newSettings: Partial<typeof settings>) => {
    // Optimistic update
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "settings",
          data: newSettings
        })
      });
    } catch (error) {
      console.error("Failed to update settings", error);
      // Revert on error would go here
    }
  };

  const updateTheme = async (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "settings",
          data: { theme: newTheme }
        })
      });
    } catch (error) {
      console.error("Failed to update theme preference", error);
    }
  };

  const handleProfileSave = async () => {
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "profile",
          data: { name: profile.name },
        }),
      });

      if (res.ok) {
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            name: profile.name,
          },
        });
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to save profile", error);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarSave = async () => {
    if (!tempAvatar.trim()) {
      return;
    }
    await updateProfileImageValue(tempAvatar.trim());
    setIsAvatarDialogOpen(false);
  };

  const handleAvatarFileSelect = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      alert("Please choose an image smaller than 2MB.");
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
    };
    reader.readAsDataURL(file);

    event.target.value = "";
  };

  const handleSubmitFeatureRequest = async () => {
    const message = featureRequestMessage.trim();
    if (!message) return;

    setIsSubmittingFeatureRequest(true);
    setFeatureRequestError(null);

    try {
      const res = await fetch("/api/feature-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFeatureRequestError(data?.error || "Failed to submit feature request.");
        return;
      }

      setFeatureRequestMessage("");
      setIsFeatureRequestDialogOpen(false);
    } catch (error) {
      console.error("Failed to submit feature request", error);
      setFeatureRequestError("Failed to submit feature request.");
    } finally {
      setIsSubmittingFeatureRequest(false);
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
      <div className="border-b border-border">
        <div className="px-6 py-4">
          <h1 className="text-lg font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your preferences
          </p>
        </div>
      </div>

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
                        onClick={() => setTempAvatar(profile.image || "")}
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
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAvatarDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAvatarSave} disabled={!tempAvatar.trim()}>
                          Save
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Display Name</label>
                  <Input 
                    value={profile.name} 
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
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
                <Button onClick={handleProfileSave} disabled={isSavingProfile}>
                  {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
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
                    onClick={() => updateTheme("light")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                      theme === "light"
                        ? "border-foreground bg-secondary"
                        : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <Sun className="w-5 h-5" />
                    <span className="text-sm font-medium">Light</span>
                  </button>
                  <button
                    onClick={() => updateTheme("dark")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                      theme === "dark"
                        ? "border-foreground bg-secondary"
                        : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <Moon className="w-5 h-5" />
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  <button
                    onClick={() => updateTheme("system")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                      theme === "system"
                        ? "border-foreground bg-secondary"
                        : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <Monitor className="w-5 h-5" />
                    <span className="text-sm font-medium">System</span>
                  </button>
                </div>
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
                label="Sound Effects"
                description="Play sounds for correct/incorrect answers"
                enabled={settings.soundEnabled}
                onToggle={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              />
              <SettingToggle
                label="Notifications"
                description="Get notified about challenges"
                enabled={settings.notificationsEnabled}
                onToggle={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
              />
              <SettingToggle
                label="Auto-advance"
                description="Automatically show next problem"
                enabled={settings.autoAdvance}
                onToggle={() => updateSettings({ autoAdvance: !settings.autoAdvance })}
              />
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
                  {["Easy", "Medium", "Hard", "Expert"].map((diff) => (
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
                <label className="text-sm font-medium mb-2 block">Timer Duration</label>
                <div className="flex gap-2">
                  {["5s", "8s", "10s", "15s"].map((time) => (
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
                <Dialog
                  open={isFeatureRequestDialogOpen}
                  onOpenChange={(open) => {
                    setIsFeatureRequestDialogOpen(open);
                    if (!open) {
                      setFeatureRequestError(null);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Send
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Feature Request</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-2 py-2">
                      <Label htmlFor="feature-request-message">What should we build?</Label>
                      <textarea
                        id="feature-request-message"
                        value={featureRequestMessage}
                        onChange={(e) => setFeatureRequestMessage(e.target.value)}
                        placeholder="Example: Add custom timer durations and a streak-based XP bonus..."
                        className="min-h-[120px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                      {featureRequestError ? (
                        <p className="text-xs text-destructive">{featureRequestError}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Sent to our backlog. Please avoid including sensitive info.
                        </p>
                      )}
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsFeatureRequestDialogOpen(false)}
                        disabled={isSubmittingFeatureRequest}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitFeatureRequest}
                        disabled={isSubmittingFeatureRequest || !featureRequestMessage.trim()}
                      >
                        {isSubmittingFeatureRequest ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Submit
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
                <Button variant="destructive" size="sm">Delete</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
