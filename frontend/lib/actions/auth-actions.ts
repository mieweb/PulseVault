"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "../auth";

export const signInWithSocial = async (provider: "github" | "google") => {
  const result = await auth.api.signInSocial({
    body: {
      provider,
      callbackURL: "/dashboard",
    },
  });
  if (result && result.url) {
    redirect(result.url);
  } else {
    throw new Error("Failed to sign in with social");
  }
};

export const signOut = async () => {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/");
};

