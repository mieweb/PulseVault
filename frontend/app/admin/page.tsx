import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import AdminClient from "./admin-client";
import { unauthorized, forbidden } from "next/navigation";

export default async function AdminPage() {
  const session = await getSession();
  const user = session?.user;
  if (!user) unauthorized();

  // Check if user is admin (case-insensitive)
  const userRole = session.user.role;
  if (!userRole || userRole.toLowerCase() !== "admin") {
    forbidden();
  }

  return <AdminClient session={session} />;
}

