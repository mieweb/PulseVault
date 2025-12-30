"use client";

import { Session } from "@/lib/auth";

export default function DashboardClient({ session }: { session: Session }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-card-foreground">
                  Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  Welcome back, {session.user.name || session.user.email}!
                </p>
              </div>
              {session.user.role && (
                <span
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
                    session.user.role === "ADMIN"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}
                >
                  {session.user.role}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-muted/50 border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                Profile
              </h3>
              <p className="text-muted-foreground text-sm">
                Manage your account settings and preferences
              </p>
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                Settings
              </h3>
              <p className="text-muted-foreground text-sm">
                Configure your application preferences
              </p>
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                Activity
              </h3>
              <p className="text-muted-foreground text-sm">
                View your recent activity and history
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-xl font-semibold text-card-foreground mb-4">
              User Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-muted-foreground w-32">Email:</span>
                <span className="text-card-foreground font-medium">
                  {session.user.email}
                </span>
              </div>
              {session.user.name && (
                <div className="flex items-center">
                  <span className="text-muted-foreground w-32">Name:</span>
                  <span className="text-card-foreground font-medium">
                    {session.user.name}
                  </span>
                </div>
              )}
              {session.user.image && (
                <div className="flex items-center">
                  <span className="text-muted-foreground w-32">Image:</span>
                  <img
                    src={session.user.image}
                    alt="Profile"
                    className="w-10 h-10 rounded-full"
                  />
                </div>
              )}
              <div className="flex items-center">
                <span className="text-muted-foreground w-32">
                  Email Verified:
                </span>
                <span
                  className={`font-medium ${
                    session.user.emailVerified
                      ? "text-green-600"
                      : "text-yellow-600"
                  }`}
                >
                  {session.user.emailVerified ? "Yes" : "No"}
                </span>
              </div>
              {session.user.role && (
                <div className="flex items-center">
                  <span className="text-muted-foreground w-32">Role:</span>
                  <span
                    className={`px-2 py-1 rounded-md text-sm font-medium ${
                      session.user.role === "ADMIN"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    {session.user.role}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
