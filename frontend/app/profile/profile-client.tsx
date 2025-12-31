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
import { z } from "zod";
import { cn } from "@/lib/utils";

// Zod validation schema for profile update
const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Required")
    .min(2, "Min 2 characters")
    .max(100, "Max 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Letters only")
    .optional()
    .or(z.literal("")),
  image: z
    .string()
    .url("Invalid URL")
    .optional()
    .or(z.literal("")),
});

// Zod validation schema for password change
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z
      .string()
      .min(1, "Required")
      .min(8, "Min 8 characters")
      .max(100, "Too long")
      .regex(/[A-Z]/, "Need uppercase")
      .regex(/[a-z]/, "Need lowercase")
      .regex(/[0-9]/, "Need number")
      .regex(/[^A-Za-z0-9]/, "Need special char"),
    confirmPassword: z.string().min(1, "Required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

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

  // Validation errors
  const [profileErrors, setProfileErrors] = useState<
    Partial<Record<keyof ProfileUpdateFormData, string>>
  >({});
  const [passwordErrors, setPasswordErrors] = useState<
    Partial<Record<keyof ChangePasswordFormData, string>>
  >({});

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
      // listAccounts returns an array directly, not wrapped in data
      if (Array.isArray(result)) {
        setAccounts(result);
      } else if (result && typeof result === "object" && "data" in result) {
        setAccounts((result as any).data);
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

  const validateProfileField = (
    field: keyof ProfileUpdateFormData,
    value: string
  ) => {
    try {
      const fieldSchema = profileUpdateSchema.shape[field];
      if (fieldSchema) {
        // For optional fields, allow empty strings
        if (value === "") {
          setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
          return;
        }
        fieldSchema.parse(value);
        setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.issues.find((issue) => issue.path[0] === field);
        setProfileErrors((prev) => ({
          ...prev,
          [field]: fieldError?.message,
        }));
      }
    }
  };

  const validateProfileForm = (): boolean => {
    try {
      profileUpdateSchema.parse({
        name: name.trim() || undefined,
        image: imageUrl.trim() || undefined,
      });
      setProfileErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<
          Record<keyof ProfileUpdateFormData, string>
        > = {};
        error.issues.forEach((issue) => {
          const path = issue.path[0] as keyof ProfileUpdateFormData;
          if (path) {
            fieldErrors[path] = issue.message;
          }
        });
        setProfileErrors(fieldErrors);

        const firstError = error.issues[0];
        if (firstError) {
          toast.error(firstError.message);
        }
      }
      return false;
    }
  };

  const handleUpdateProfile = async () => {
    if (!validateProfileForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await updateUser({
        name: name.trim() || undefined,
        image: imageUrl.trim() || undefined,
      });
      if (result) {
        toast.success("Profile updated successfully");
        setEditProfileOpen(false);
        setProfileErrors({});
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const validatePasswordField = (
    field: keyof ChangePasswordFormData,
    value: string
  ) => {
    try {
      const fieldSchema = changePasswordSchema.shape[field];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setPasswordErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.issues.find((issue) => issue.path[0] === field);
        setPasswordErrors((prev) => ({
          ...prev,
          [field]: fieldError?.message,
        }));
      }
    }
  };

  const validatePasswordForm = (): boolean => {
    try {
      changePasswordSchema.parse({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<
          Record<keyof ChangePasswordFormData, string>
        > = {};
        error.issues.forEach((issue) => {
          const path = issue.path[0] as keyof ChangePasswordFormData;
          if (path) {
            fieldErrors[path] = issue.message;
          }
        });
        setPasswordErrors(fieldErrors);

        const firstError = error.issues[0];
        if (firstError) {
          toast.error(firstError.message);
        }
      }
      return false;
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) {
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
        setPasswordErrors({});
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
          <div className="pb-6">
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
                        onChange={(e) => {
                          setName(e.target.value);
                          validateProfileField("name", e.target.value);
                        }}
                        onBlur={() => validateProfileField("name", name)}
                        placeholder="Your name"
                        className={cn(profileErrors.name && "border-destructive")}
                      />
                      {profileErrors.name && (
                        <p className="text-sm text-destructive mt-1">
                          {profileErrors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="image">Profile Image URL</Label>
                      <Input
                        id="image"
                        value={imageUrl}
                        onChange={(e) => {
                          setImageUrl(e.target.value);
                          if (e.target.value) {
                            validateProfileField("image", e.target.value);
                          } else {
                            setProfileErrors((prev) => ({
                              ...prev,
                              image: undefined,
                            }));
                          }
                        }}
                        onBlur={() => {
                          if (imageUrl) {
                            validateProfileField("image", imageUrl);
                          }
                        }}
                        placeholder="https://example.com/image.jpg"
                        className={cn(profileErrors.image && "border-destructive")}
                      />
                      {profileErrors.image && (
                        <p className="text-sm text-destructive mt-1">
                          {profileErrors.image}
                        </p>
                      )}
                      {!profileErrors.image && imageUrl && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Valid image URL
                        </p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditProfileOpen(false);
                        setProfileErrors({});
                        // Reset to original values
                        setName(session.user.name || "");
                        setImageUrl(session.user.image || "");
                      }}
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
          <div className="pb-6">
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
            <div className="pb-6">
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
                          onChange={(e) => {
                            setCurrentPassword(e.target.value);
                            validatePasswordField("currentPassword", e.target.value);
                          }}
                          onBlur={() =>
                            validatePasswordField("currentPassword", currentPassword)
                          }
                          placeholder="Enter current password"
                          className={cn(
                            passwordErrors.currentPassword && "border-destructive"
                          )}
                        />
                        {passwordErrors.currentPassword && (
                          <p className="text-sm text-destructive mt-1">
                            {passwordErrors.currentPassword}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            validatePasswordField("newPassword", e.target.value);
                            // Re-validate password confirmation if it has a value
                            if (confirmPassword) {
                              validatePasswordField("confirmPassword", confirmPassword);
                            }
                          }}
                          onBlur={() => {
                            validatePasswordField("newPassword", newPassword);
                            if (confirmPassword) {
                              validatePasswordField("confirmPassword", confirmPassword);
                            }
                          }}
                          placeholder="Enter new password"
                          className={cn(
                            passwordErrors.newPassword && "border-destructive"
                          )}
                        />
                        {passwordErrors.newPassword && (
                          <p className="text-sm text-destructive mt-1">
                            {passwordErrors.newPassword}
                          </p>
                        )}
                        {!passwordErrors.newPassword && newPassword && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Min 8 chars: uppercase, lowercase, number, special char
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="confirmPassword">
                          Confirm New Password
                        </Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            validatePasswordField("confirmPassword", e.target.value);
                            // Re-validate new password to check match
                            if (newPassword) {
                              validatePasswordField("newPassword", newPassword);
                            }
                          }}
                          onBlur={() => {
                            validatePasswordField("confirmPassword", confirmPassword);
                            if (newPassword) {
                              validatePasswordField("newPassword", newPassword);
                            }
                          }}
                          placeholder="Confirm new password"
                          className={cn(
                            passwordErrors.confirmPassword && "border-destructive"
                          )}
                        />
                        {passwordErrors.confirmPassword && (
                          <p className="text-sm text-destructive mt-1">
                            {passwordErrors.confirmPassword}
                          </p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setChangePasswordOpen(false);
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                          setPasswordErrors({});
                        }}
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
          <div className="pb-6">
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
          <div className="pt-6">
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
                      Delete
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
                        Delete
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
