"use client";

import { Session } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  updateUser,
  changePassword,
  listAccounts,
  linkSocial,
  unlinkAccount,
  deleteUser,
} from "@/lib/actions/profile-actions";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Edit,
  Lock,
  Link as LinkIcon,
  Unlink,
  Trash2,
  Loader2,
  Shield,
  Github,
} from "lucide-react";

export default function ProfileClient({ session }: { session: Session }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Form states
  const [name, setName] = useState(session.user.name || "");
  const [imageUrl, setImageUrl] = useState(session.user.image || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");

  // Dialog states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [linkAccountOpen, setLinkAccountOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, [refreshKey]);

  const loadAccounts = async () => {
    try {
      const result = await listAccounts();
      if (result?.data) {
        setAccounts(result.data);
      }
    } catch (error) {
      console.error("Failed to load accounts:", error);
    }
  };

  const getUserInitials = () => {
    if (!session?.user) return "U";
    const name = session.user.name;
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name[0].toUpperCase();
    }
    return session.user.email?.[0].toUpperCase() || "U";
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const result = await updateUser({
        name: name.trim() || undefined,
        image: imageUrl.trim() || undefined,
      });
      if (result) {
        toast.success("Profile updated successfully");
        setEditProfileOpen(false);
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });
      if (result) {
        toast.success("Password changed successfully");
        setChangePasswordOpen(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSocial = async (provider: "google" | "github") => {
    setLoading(true);
    try {
      const result = await linkSocial({
        provider,
        callbackURL: "/profile",
      });
      if (result?.url) {
        window.location.href = result.url;
      } else {
        toast.error("Failed to initiate account linking");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to link account");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkAccount = async (providerId: string) => {
    if (accounts.length <= 1) {
      toast.error("Cannot unlink your only account");
      return;
    }
    setLoading(true);
    try {
      const result = await unlinkAccount({ providerId });
      if (result) {
        toast.success("Account unlinked successfully");
        setRefreshKey((k) => k + 1);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to unlink account");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }
    setLoading(true);
    try {
      const result = await deleteUser({
        password: deletePassword || undefined,
        callbackURL: "/",
      });
      if (result) {
        toast.success("Account deletion initiated");
        router.push("/");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId.toLowerCase()) {
      case "google":
        return "🔵";
      case "github":
        return <Github className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getProviderName = (providerId: string) => {
    switch (providerId.toLowerCase()) {
      case "credential":
        return "Email & Password";
      case "google":
        return "Google";
      case "github":
        return "GitHub";
      default:
        return providerId;
    }
  };

  const hasCredentialAccount = accounts.some(
    (acc) => acc.providerId === "credential"
  );
  const hasGoogleAccount = accounts.some(
    (acc) => acc.providerId === "google"
  );
  const hasGithubAccount = accounts.some(
    (acc) => acc.providerId === "github"
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-card-foreground">Profile</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account information and preferences
            </p>
          </div>

          {/* Profile Picture & Name Section */}
          <div className="border-b border-border pb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-card-foreground">
                Profile Information
              </h2>
              <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                      Update your name and profile picture
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="image">Profile Image URL</Label>
                      <Input
                        id="image"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setEditProfileOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateProfile} disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={session.user.image || undefined}
                  alt={session.user.name || session.user.email || "User"}
                />
                <AvatarFallback className="text-2xl">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold text-card-foreground">
                  {session.user.name || "Not set"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="border-b border-border pb-6">
            <h2 className="text-xl font-semibold text-card-foreground mb-4">
              Account Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    Email
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    Email Verified
                  </p>
                  <p
                    className={`text-sm ${
                      session.user.emailVerified
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {session.user.emailVerified ? "Verified" : "Not Verified"}
                  </p>
                </div>
              </div>
              {session.user.role && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">
                      Role
                    </p>
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-medium ${
                        session.user.role?.toLowerCase() === "admin"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {session.user.role}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Password Section */}
          {hasCredentialAccount && (
            <div className="border-b border-border pb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-card-foreground">
                  Password
                </h2>
                <Dialog
                  open={changePasswordOpen}
                  onOpenChange={setChangePasswordOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">
                          Confirm New Password
                        </Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setChangePasswordOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleChangePassword} disabled={loading}>
                        {loading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Change Password
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-sm text-muted-foreground">
                Last updated: Password is encrypted and secure
              </p>
            </div>
          )}

          {/* Linked Accounts */}
          <div className="border-b border-border pb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-card-foreground">
                Linked Accounts
              </h2>
              <Dialog open={linkAccountOpen} onOpenChange={setLinkAccountOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link Social Account</DialogTitle>
                    <DialogDescription>
                      Connect a social account to your profile
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    {!hasGoogleAccount && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleLinkSocial("google")}
                        disabled={loading}
                      >
                        <span className="mr-2">🔵</span>
                        Link Google Account
                      </Button>
                    )}
                    {!hasGithubAccount && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleLinkSocial("github")}
                        disabled={loading}
                      >
                        <Github className="h-4 w-4 mr-2" />
                        Link GitHub Account
                      </Button>
                    )}
                    {hasGoogleAccount && hasGithubAccount && (
                      <p className="text-sm text-muted-foreground text-center">
                        All available accounts are linked
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-3">
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No linked accounts
                </p>
              ) : (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {getProviderIcon(account.providerId)}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">
                          {getProviderName(account.providerId)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {account.accountId || "Connected"}
                        </p>
                      </div>
                    </div>
                    {accounts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlinkAccount(account.providerId)}
                        disabled={loading}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-destructive/20 pt-6">
            <h2 className="text-xl font-semibold text-destructive mb-4">
              Danger Zone
            </h2>
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    Delete Account
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data.
                    This action cannot be undone.
                  </p>
                </div>
                <Dialog
                  open={deleteAccountOpen}
                  onOpenChange={setDeleteAccountOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-destructive">
                        Delete Account
                      </DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently
                        delete your account and all associated data.
                      </DialogDescription>
                    </DialogHeader>
                    {hasCredentialAccount && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="deletePassword">
                            Enter your password to confirm
                          </Label>
                          <Input
                            id="deletePassword"
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Your password"
                          />
                        </div>
                      </div>
                    )}
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteAccountOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={loading}
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Delete Account
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
