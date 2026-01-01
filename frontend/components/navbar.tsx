"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut, User, Shield, LayoutDashboard } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth-actions";
import { toast } from "sonner";
import { useState } from "react";
import { ModeToggle } from "@/components/mode-toggle";

type Session = typeof auth.$Infer.Session;

export default function Navbar({ session }: { session?: Session | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/auth";
  const isLoggedIn = session?.user;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check if user is admin (case-insensitive)
  const isAdmin =
    isLoggedIn &&
    session.user.role &&
    session.user.role.toLowerCase() === "admin";

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to sign out");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleProfileClick = () => {
    router.push("/profile");
  };

  const handleAdminClick = () => {
    router.push("/admin");
  };

  // Get user initials for avatar fallback
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

  return (
    <nav className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">
              <span className="text-destructive">Pulse</span><span className="text-foreground dark:text-white">Vault</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ModeToggle />

            {/* Login/User Menu */}
            {!isAuthPage && (
              <>
                {isLoggedIn ? (
                  <>
                    {/* Dashboard Button */}
                    <Link href="/dashboard">
                      <Button
                        variant="outline"
                        className="border-border hover:bg-muted"
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline-block">Dashboard</span>
                      </Button>
                    </Link>
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="relative h-10 w-10 p-1.5 border-border hover:bg-muted"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage
                            src={session.user.image || undefined}
                            alt={session.user.name || session.user.email || "User"}
                          />
                          <AvatarFallback className="text-xs">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {session.user.name || "User"}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {session.user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleProfileClick}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuItem onClick={handleAdminClick}>
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Admin</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        disabled={isLoggingOut}
                        className="text-destructive focus:text-destructive"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </>
                ) : (
                  <Link href="/auth">
                    <Button className="bg-destructive hover:bg-destructive/90 text-white">
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
