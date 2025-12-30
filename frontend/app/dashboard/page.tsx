import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import { signOut } from "@/lib/actions/auth-actions";
import DashboardClient from "./dashboard-client";
import { unauthorized } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  const user = session?.user;
  if(!user)unauthorized();
  return <DashboardClient session={session} />;
}
