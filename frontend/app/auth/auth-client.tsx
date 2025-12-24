"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import Image from "next/image";
import { Loader2, X, Shield, Video, Lock, Zap, Heart } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { signIn, signUp, signInWithSocial } from "@/lib/actions/auth-actions";

async function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AuthClient() {
  const [isSignIn, setIsSignIn] = useState(true);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Sign up state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Sign in state
  const [rememberMe, setRememberMe] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        toast.error("Image size must be less than 5MB");
        e.target.value = ""; // Reset input
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - PulseVault Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-black p-12 flex-col justify-center text-white relative overflow-hidden">
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Subtle Animated Orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-red-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-red-600/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="max-w-lg relative z-10">
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-4 text-white">
              Pulse<span className="text-red-500">Vault</span>
            </h1>
            <p className="text-xl text-gray-400">
              Secure video storage and delivery for healthcare and research
            </p>
          </div>

          <div className="space-y-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-800 rounded-lg border border-gray-800">
                <Shield className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-white">
                  HIPAA Compliant
                </h3>
                <p className="text-gray-500 text-sm">
                  Built with security and compliance at its core
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-800 rounded-lg border border-gray-800">
                <Video className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-white">
                  Adaptive Streaming
                </h3>
                <p className="text-gray-500 text-sm">
                  Automatic transcoding for optimal playback experience
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-800 rounded-lg border border-gray-800">
                <Lock className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-white">
                  Secure Access
                </h3>
                <p className="text-gray-500 text-sm">
                  HMAC-signed URLs with configurable expiry
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-800 rounded-lg border border-gray-800">
                <Zap className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1 text-white">
                  Resumable Uploads
                </h3>
                <p className="text-gray-500 text-sm">
                  Reliable large-file transfers with automatic resume
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
            <span>
              Your data has a heartbeat.{" "}
              <span className="text-red-500">PulseVault</span> protects it.
            </span>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">
              {isSignIn ? "Sign In" : "Sign Up"}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              {isSignIn
                ? "Enter your email below to login to your account"
                : "Enter your information to create an account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSignIn ? (
              // Sign In Form
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="password"
                    autoComplete="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      onClick={() => {
                        setRememberMe(!rememberMe);
                      }}
                    />
                    <Label htmlFor="remember">Remember me</Label>
                  </div>
                  <Link href="#" className="text-sm underline">
                    Forgot your password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const result = await signIn(email, password, rememberMe);
                      if (result && result.user) {
                        toast.success("Signed in successfully");
                        router.push("/dashboard");
                      }
                    } catch (error: any) {
                      toast.error(error?.message || "Failed to sign in");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Login"
                  )}
                </Button>

                <div
                  className={cn(
                    "w-full gap-2 flex items-center",
                    "justify-between flex-col"
                  )}
                >
                  <Button
                    variant="outline"
                    className={cn("w-full gap-2")}
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await signInWithSocial("google");
                      } catch (error: any) {
                        toast.error(
                          error?.message || "Failed to sign in with Google"
                        );
                        setLoading(false);
                      }
                    }}
                  >
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
                  </Button>
                  <Button
                    variant="outline"
                    className={cn("w-full gap-2")}
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await signInWithSocial("github");
                      } catch (error: any) {
                        toast.error(
                          error?.message || "Failed to sign in with GitHub"
                        );
                        setLoading(false);
                      }
                    }}
                  >
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
                  </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground mt-4">
                  Don't have an account?{" "}
                  <button
                    onClick={() => setIsSignIn(!isSignIn)}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            ) : (
              // Sign Up Form
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="first-name">First name</Label>
                    <Input
                      id="first-name"
                      placeholder="Max"
                      required
                      onChange={(e) => {
                        setFirstName(e.target.value);
                      }}
                      value={firstName}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="last-name">Last name</Label>
                    <Input
                      id="last-name"
                      placeholder="Robinson"
                      required
                      onChange={(e) => {
                        setLastName(e.target.value);
                      }}
                      value={lastName}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    onChange={(e) => {
                      setEmail(e.target.value);
                    }}
                    value={email}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password_confirmation">
                    Confirm Password
                  </Label>
                  <Input
                    id="password_confirmation"
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Confirm Password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="image">Profile Image (optional)</Label>
                  <div className="flex items-end gap-4">
                    {imagePreview && (
                      <div className="relative w-16 h-16 rounded-sm overflow-hidden">
                        <Image
                          src={imagePreview}
                          alt="Profile preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 w-full">
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="w-full"
                      />
                      {imagePreview && (
                        <X
                          className="cursor-pointer"
                          onClick={() => {
                            setImage(null);
                            setImagePreview(null);
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  onClick={async () => {
                    if (password !== passwordConfirmation) {
                      toast.error("Passwords do not match");
                      return;
                    }
                    setLoading(true);
                    try {
                      // Convert image to base64 if provided
                      const imageBase64 = image
                        ? await convertImageToBase64(image)
                        : undefined;

                      const result = await signUp(
                        email,
                        password,
                        `${firstName} ${lastName}`,
                        imageBase64
                      );
                      if (result && result.user) {
                        toast.success("Account created successfully");
                        router.push("/dashboard");
                      }
                    } catch (error: any) {
                      toast.error(error?.message || "Failed to sign up");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Create an account"
                  )}
                </Button>

                <div className="text-center text-sm text-muted-foreground mt-4">
                  Already have an account?{" "}
                  <button
                    onClick={() => setIsSignIn(!isSignIn)}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
