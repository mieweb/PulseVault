"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "../auth";

export const signUp = async (
  email: string,
  password: string,
  name: string,
  image?: string
) => {
  const result = await auth.api.signUpEmail({
    body: {
      email,
      name,
      password,
      image,
      callbackURL: "/dashboard",
    },
  });
  return result;
};

export const signIn = async (
  email: string,
  password: string,
  rememberMe?: boolean
) => {
  const result = await auth.api.signInEmail({
    body: {
      email,
      password,
      callbackURL: "/dashboard",
    },
  });
  // Note: better-auth handles session persistence via cookies
  // The rememberMe flag can be used for custom session duration logic if needed
  return result;
};

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
