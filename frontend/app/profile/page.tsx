import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import ProfileClient from "./profile-client";
import { unauthorized } from "next/navigation";

export default async function ProfilePage() {
  const session = await getSession();
  const user = session?.user;
  if (!user) unauthorized();
  return <ProfileClient session={session} />;
}

