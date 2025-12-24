"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth-actions";
import { toast } from "sonner";
import { useState } from "react";
import { ModeToggle } from "@/components/mode-toggle";

type Session = typeof auth.$Infer.Session;

export default function Navbar({ session }: { session?: Session | null }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/auth";
  const isLoggedIn = session?.user;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  return (
    <nav className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">
              Pulse<span className="text-destructive">Vault</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ModeToggle />

            {/* Login/Logout Button */}
            {!isAuthPage && (
              <>
                {isLoggedIn ? (
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    className="border-border hover:bg-muted"
                    disabled={isLoggingOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </Button>
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
