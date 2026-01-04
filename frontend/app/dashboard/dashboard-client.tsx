"use client";

import { Session } from "@/lib/auth";
import { UploadQRCard } from "@/components/upload-qr-card";

export default function DashboardClient({ session }: { session: Session }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6 items-start">
          {/* Left side - QR Card */}
          <div className="w-80 flex-shrink-0">
            <UploadQRCard />
          </div>
          
          {/* Right side - Main content */}
          <div className="flex-1">
            <div className="bg-card rounded-lg shadow-sm border border-border p-8">
              <div className="flex items-center justify-center">
                {session.user.role && (
                  <span
                    className={`px-4 py-2 rounded-md text-base font-semibold ${
                      session.user.role.toLowerCase() === "admin"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    {session.user.role}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
