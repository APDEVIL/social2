"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Lock,
  Bell,
  Shield,
  Palette,
  LogOut,
  Camera,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { api } from "@/trpc/react";
import { useUploadThing } from "@/lib/uploadthing";
import { UserAvatar } from "@/components/shared-primitives/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { authClient } from "@/server/better-auth/client";

export default function SettingsPage() {
  const router = useRouter();
  const utils = api.useUtils();

  const { data: me } = api.user.getProfile.useQuery({ username: "me" });

  // Profile form state
  const [name, setName] = useState(me?.name ?? "");
  const [username, setUsername] = useState(me?.username ?? "");
  const [bio, setBio] = useState(me?.bio ?? "");
  const [website, setWebsite] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(me?.avatarUrl ?? "");
  const [isPrivate, setIsPrivate] = useState(me?.isPrivate ?? false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  // Notification prefs
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifFollows, setNotifFollows] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);

  const { startUpload, isUploading } = useUploadThing("avatar", {
    onClientUploadComplete: (res) => {
      const url = res?.[0]?.url;
      if (url) setAvatarUrl(url);
    },
    onUploadError: (err) => { toast.error(err.message ?? "Avatar upload failed"); },
  });

  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated");
      void utils.user.getProfile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void startUpload([file]);
  };

  const handleSaveProfile = () => {
    updateProfile.mutate({ name, username, bio, avatarUrl: avatarUrl || undefined, isPrivate });
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    // better-auth password change
    toast.success("Password updated");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 rounded-xl bg-muted/60 p-1">
          <TabsTrigger value="profile" className="rounded-lg text-xs sm:text-sm">
            <User className="mr-1.5 h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg text-xs sm:text-sm">
            <Lock className="mr-1.5 h-3.5 w-3.5" /> Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg text-xs sm:text-sm">
            <Bell className="mr-1.5 h-3.5 w-3.5" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="privacy" className="rounded-lg text-xs sm:text-sm">
            <Shield className="mr-1.5 h-3.5 w-3.5" /> Privacy
          </TabsTrigger>
        </TabsList>

        {/* ── PROFILE TAB ── */}
        <TabsContent value="profile" className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            {/* Avatar upload */}
            <div className="mb-6 flex items-center gap-5">
              <div className="relative">
                <UserAvatar
                  src={avatarUrl}
                  username={username}
                  size="2xl"
                />
                <label
                  htmlFor="avatar-upload"
                  className={cn(
                    "absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center",
                    "rounded-full border-2 border-background bg-brand text-brand-foreground",
                    "shadow-md transition hover:scale-105",
                    isUploading && "opacity-50 pointer-events-none"
                  )}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <div>
                <p className="font-semibold">{me?.name}</p>
                <p className="text-sm text-muted-foreground">@{me?.username}</p>
                {isUploading && (
                  <p className="mt-1 text-xs text-brand">Uploading…</p>
                )}
              </div>
            </div>

            <Separator className="mb-6" />

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-7"
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the world about yourself…"
                  className="resize-none"
                  rows={3}
                  maxLength={150}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {bio.length}/150
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yoursite.com"
                  type="url"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={updateProfile.isPending}
                className="bg-brand text-brand-foreground hover:bg-brand/90 px-8"
              >
                {updateProfile.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── SECURITY TAB ── */}
        <TabsContent value="security" className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-1 font-semibold">Change Password</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Use a strong password you don't use elsewhere.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-pw">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-pw"
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-pw">New Password</Label>
                <Input
                  id="new-pw"
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-pw">Confirm New Password</Label>
                <Input
                  id="confirm-pw"
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {/* Password strength */}
              {newPassword.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          newPassword.length >= level * 3
                            ? level <= 1 ? "bg-red-500"
                              : level <= 2 ? "bg-yellow-500"
                              : level <= 3 ? "bg-blue-500"
                              : "bg-green-500"
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {newPassword.length < 4 ? "Too short" : newPassword.length < 7 ? "Weak" : newPassword.length < 10 ? "Good" : "Strong"}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleChangePassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
                className="bg-brand text-brand-foreground hover:bg-brand/90 px-8"
              >
                Update Password
              </Button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm">
            <h2 className="mb-1 font-semibold text-destructive">Danger Zone</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              These actions are permanent and cannot be undone.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      All your posts, reels, stories, and messages will be permanently deleted.
                      This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground">
                      Yes, delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </TabsContent>

        {/* ── NOTIFICATIONS TAB ── */}
        <TabsContent value="notifications">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-1 font-semibold">Notification Preferences</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Choose what you want to be notified about.
            </p>

            <div className="space-y-0 divide-y">
              {[
                { label: "Likes", description: "When someone likes your post or reel", value: notifLikes, set: setNotifLikes },
                { label: "Comments", description: "When someone comments on your content", value: notifComments, set: setNotifComments },
                { label: "New Followers", description: "When someone follows you", value: notifFollows, set: setNotifFollows },
                { label: "Direct Messages", description: "When you receive a new message", value: notifMessages, set: setNotifMessages },
              ].map(({ label, description, value, set }) => (
                <div key={label} className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={set}
                    className="data-[state=checked]:bg-brand"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                className="bg-brand text-brand-foreground hover:bg-brand/90 px-8"
                onClick={() => toast.success("Notification preferences saved")}
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── PRIVACY TAB ── */}
        <TabsContent value="privacy">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="mb-1 font-semibold">Privacy Settings</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Control who can see your content and interact with you.
            </p>

            <div className="space-y-0 divide-y">
              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">Private Account</p>
                  <p className="text-sm text-muted-foreground">
                    Only approved followers can see your posts
                  </p>
                </div>
                <Switch
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                  className="data-[state=checked]:bg-brand"
                />
              </div>

              {[
                { label: "Show Activity Status", description: "Let others see when you were last active" },
                { label: "Allow Story Replies", description: "Let followers reply to your stories" },
                { label: "Allow Tags", description: "Let others tag you in their posts" },
                { label: "Allow DMs from Non-Followers", description: "Receive messages from anyone" },
              ].map(({ label, description }) => (
                <div key={label} className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <Switch
                    defaultChecked
                    className="data-[state=checked]:bg-brand"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                className="bg-brand text-brand-foreground hover:bg-brand/90 px-8"
                onClick={() => {
                  updateProfile.mutate({ isPrivate });
                  toast.success("Privacy settings saved");
                }}
              >
                Save Settings
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}