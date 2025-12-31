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
  listAccounts,
  unlinkAccount,
  deleteUser,
} from "@/lib/actions/profile-actions";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Edit,
  Unlink,
  Trash2,
  Loader2,
  Shield,
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
});

type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

export default function ProfileClient({ session }: { session: Session }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Form states
  const [name, setName] = useState(session.user.name || "");

  // Validation errors
  const [profileErrors, setProfileErrors] = useState<
    Partial<Record<keyof ProfileUpdateFormData, string>>
  >({});

  // Dialog states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
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
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 256 262"
            className="h-4 w-4"
          >
            <path
              fill="#4285F4"
              d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
            ></path>
            <path
              fill="#34A853"
              d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
            ></path>
            <path
              fill="#FBBC05"
              d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
            ></path>
            <path
              fill="#EB4335"
              d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
            ></path>
          </svg>
        );
      case "github":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 24 24"
            className="h-4 w-4"
          >
            <path
              fill="currentColor"
              d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
            ></path>
          </svg>
        );
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
                      Update your name
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
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditProfileOpen(false);
                        setProfileErrors({});
                        // Reset to original values
                        setName(session.user.name || "");
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


          {/* Linked Accounts */}
          <div className="pb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-card-foreground">
                Linked Accounts
              </h2>
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
                      <div className="flex items-center justify-center">
                        {getProviderIcon(account.providerId)}
                      </div>
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
                    This action cannot be undone. Note: Uploaded videos will not be deleted.
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
                        delete your account and all associated data. Note: Uploaded videos will not be deleted.
                      </DialogDescription>
                    </DialogHeader>
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
