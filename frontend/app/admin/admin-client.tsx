"use client";

import { Session } from "@/lib/auth";
import { Shield } from "lucide-react";
import AdminApiKeys from "./admin-api-keys";

export default function AdminClient({ session }: { session: Session }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-card-foreground flex items-center gap-2">
                  <Shield className="h-8 w-8" />
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage users, settings, and system configuration
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-md text-sm font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                ADMIN
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-6 mt-6">
            <h2 className="text-xl font-semibold text-card-foreground mb-4">
              Admin Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-muted-foreground w-32">Logged in as:</span>
                <span className="text-card-foreground font-medium">
                  {session.user.name || session.user.email}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-muted-foreground w-32">Email:</span>
                <span className="text-card-foreground font-medium">
                  {session.user.email}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-muted-foreground w-32">Role:</span>
                <span className="px-2 py-1 rounded-md text-sm font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                  {session.user.role || "ADMIN"}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6 mt-6">
            <h2 className="text-xl font-semibold text-card-foreground mb-4">
              API keys for external apps
            </h2>
            <AdminApiKeys />
          </div>
        </div>
      </div>
    </div>
  );
}

