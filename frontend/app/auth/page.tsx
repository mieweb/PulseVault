import { redirect } from "next/navigation";
import { getSession } from "@/lib/get-session";
import AuthClient from "./auth-client";

export default async function AuthPage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <AuthClient />;
}
