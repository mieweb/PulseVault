"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { Loader2, Shield, Video, Lock, Zap, Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { signInWithSocial } from "@/lib/actions/auth-actions";

export default function AuthClient() {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "github" | null>(null);

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Vitals Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-background p-12 flex-col justify-center text-foreground relative overflow-hidden">
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Subtle Animated Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-red-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-red-600/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="max-w-lg relative z-10">
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-4 text-foreground">
              <span className="text-white">Vi</span><span className="text-destructive">tals</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Upload, view, and manage short-form videos for healthcare and research
            </p>
          </div>

          <div className="space-y-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-muted rounded-lg border border-border">
                <Shield className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-foreground">
                  HIPAA Compliant
                </h3>
                <p className="text-muted-foreground text-sm">
                  Built with security and compliance at its core
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-muted rounded-lg border border-border">
                <Video className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-foreground">
                  Short-Form Video Feed
                </h3>
                <p className="text-muted-foreground text-sm">
                  Browse and view short-form videos in an infinite scrolling feed
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-muted rounded-lg border border-border">
                <Lock className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-foreground">
                  Secure Access
                </h3>
                <p className="text-muted-foreground text-sm">
                  HMAC-signed URLs with configurable expiry
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-muted rounded-lg border border-border">
                <Zap className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-foreground">
                  Easy Video Upload
                </h3>
                <p className="text-muted-foreground text-sm">
                  Upload videos directly from your browser with resumable uploads
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Heart className="w-4 h-4 fill-destructive text-destructive" />
            <span>
              Your data has a heartbeat.{" "}
              <span className="text-white">Vi</span><span className="text-destructive">tals</span> makes it visible.
            </span>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Sign in with your social account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div
                className={cn(
                  "w-full gap-2 flex items-center",
                  "justify-between flex-col"
                )}
              >
                <Button
                  variant="outline"
                  className={cn("w-full gap-2")}
                  disabled={loadingProvider !== null}
                  onClick={async () => {
                    setLoadingProvider("google");
                    try {
                      await signInWithSocial("google");
                    } catch (error: any) {
                      toast.error(
                        error?.message || "Failed to sign in with Google"
                      );
                      setLoadingProvider(null);
                    }
                  }}
                >
                  {loadingProvider === "google" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1em"
                        height="1em"
                        viewBox="0 0 256 262"
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
                      Sign in with Google
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className={cn("w-full gap-2")}
                  disabled={loadingProvider !== null}
                  onClick={async () => {
                    setLoadingProvider("github");
                    try {
                      await signInWithSocial("github");
                    } catch (error: any) {
                      toast.error(
                        error?.message || "Failed to sign in with GitHub"
                      );
                      setLoadingProvider(null);
                    }
                  }}
                >
                  {loadingProvider === "github" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1em"
                        height="1em"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
                        ></path>
                      </svg>
                      Sign in with Github
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
