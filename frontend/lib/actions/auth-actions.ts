"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "../auth";

export const signUp = async (email: string, password: string, name: string) => {
  const result = await auth.api.signUpEmail({
    body: {
      email,
      name,
      password,
      callbackURL: "/dashboard",
    },
  });
  return result;
};

export const signIn = async (email: string, password: string) => {
  const result = await auth.api.signInEmail({
    body: {
      email,
      password,
      callbackURL: "/dashboard",
    },
  });
  return result;
};

export const signOut = async () => {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/");
};
