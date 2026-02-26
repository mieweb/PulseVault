"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Session } from "@/lib/auth";
import { Shield, Users, Settings, Activity, TrendingUp } from "lucide-react";
import { getTopVideos } from "@/lib/actions/admin-actions";

export default function AdminClient({ session }: { session: Session }) {
  const [topVideos, setTopVideos] = useState<{ videoId: string; watched50Count: number }[]>([])

  useEffect(() => {
    getTopVideos()
      .then((data) => setTopVideos(data))
      .catch((err) => console.error('[analytics] failed to fetch top videos:', err))
  }, [])

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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-muted/50 border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-card-foreground" />
                <h3 className="text-lg font-semibold text-card-foreground">
                  User Management
                </h3>
              </div>
              <p className="text-muted-foreground text-sm">
                View, create, and manage user accounts
              </p>
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="h-5 w-5 text-card-foreground" />
                <h3 className="text-lg font-semibold text-card-foreground">
                  System Settings
                </h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Configure system-wide settings and preferences
              </p>
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="h-5 w-5 text-card-foreground" />
                <h3 className="text-lg font-semibold text-card-foreground">
                  Activity Logs
                </h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Monitor system activity and audit logs
              </p>
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-5 w-5 text-card-foreground" />
                <h3 className="text-lg font-semibold text-card-foreground">
                  Security
                </h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Manage security policies and access controls
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-xl font-semibold text-card-foreground mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  Create New User
                </h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Add a new user to the system
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Feature coming soon
                </p>
              </div>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  View All Users
                </h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Browse and manage all user accounts
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Feature coming soon
                </p>
              </div>
              <Link href="/analytics" className="block">
                <div className="bg-muted/50 border border-border rounded-lg p-4 hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-card-foreground" />
                    <h3 className="text-lg font-semibold text-card-foreground">
                      Top Videos by 50% Watch Rate
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">
                    Videos ranked by how many unique users watched past the halfway point.
                  </p>
                  {topVideos.length > 0 ? (
                    <ul className="space-y-1">
                      {topVideos.slice(0, 3).map((v) => (
                        <li key={v.videoId} className="flex justify-between text-xs text-muted-foreground">
                          <span className="truncate max-w-[160px]">{v.videoId}</span>
                          <span className="font-medium text-card-foreground ml-2">{v.watched50Count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No data yet</p>
                  )}
                </div>
              </Link>
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  Export Data
                </h3>
                <p className="text-muted-foreground text-sm mb-3">
                  Export user data and system reports
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Feature coming soon
                </p>
              </div>
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
        </div>
      </div>
    </div>
  );
}

