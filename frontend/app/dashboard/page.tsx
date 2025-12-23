import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth-actions";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Welcome back, {session.user.name || session.user.email}!
              </p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Profile
              </h3>
              <p className="text-blue-700 text-sm">
                Manage your account settings and preferences
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Settings
              </h3>
              <p className="text-green-700 text-sm">
                Configure your application preferences
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                Activity
              </h3>
              <p className="text-purple-700 text-sm">
                View your recent activity and history
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              User Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-gray-600 w-32">Email:</span>
                <span className="text-gray-900 font-medium">
                  {session.user.email}
                </span>
              </div>
              {session.user.name && (
                <div className="flex items-center">
                  <span className="text-gray-600 w-32">Name:</span>
                  <span className="text-gray-900 font-medium">
                    {session.user.name}
                  </span>
                </div>
              )}
              {session.user.image && (
                <div className="flex items-center">
                  <span className="text-gray-600 w-32">Image:</span>
                  <img
                    src={session.user.image}
                    alt="Profile"
                    className="w-10 h-10 rounded-full"
                  />
                </div>
              )}
              <div className="flex items-center">
                <span className="text-gray-600 w-32">Email Verified:</span>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
