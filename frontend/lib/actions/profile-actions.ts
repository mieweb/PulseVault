"use server";

import { headers } from "next/headers";
import { auth } from "../auth";
import { getSession } from "../get-session";
import { unauthorized } from "next/navigation";

/**
 * Helper function to ensure user is authenticated
 * Throws unauthorized() if no session or user
 */
async function requireAuth() {
  const session = await getSession();
  if (!session?.user) unauthorized();
  return session;
}

/**
 * Update user information (name, image)
 */
export const updateUser = async (data: {
  name?: string;
  image?: string;
}) => {
  await requireAuth();

  const result = await auth.api.updateUser({
    body: {
      name: data.name,
      image: data.image,
    },
    headers: await headers(),
  });

  return result;
};

/**
 * Change user password
 */
export const changePassword = async (data: {
  newPassword: string;
  currentPassword: string;
  revokeOtherSessions?: boolean;
}) => {
  await requireAuth();

  const result = await auth.api.changePassword({
    body: {
      newPassword: data.newPassword,
      currentPassword: data.currentPassword,
      revokeOtherSessions: data.revokeOtherSessions ?? false,
    },
    headers: await headers(),
  });

  return result;
};

/**
 * List all accounts linked to the user
 */
export const listAccounts = async () => {
  await requireAuth();

  const result = await auth.api.listUserAccounts({
    headers: await headers(),
  });

  return result;
};

/**
 * Link a social account to the user
 * Returns a URL to redirect to for OAuth flow
 */
export const linkSocial = async (data: {
  provider: "google" | "github";
  callbackURL?: string;
}) => {
  await requireAuth();

  // For account linking, we need to use signInSocial with a special flag
  // Better Auth handles linking automatically if the email matches
  const result = await auth.api.signInSocial({
    body: {
      provider: data.provider,
      callbackURL: data.callbackURL || "/profile",
    },
    headers: await headers(),
  });

  return result;
};

/**
 * Unlink an account from the user
 */
export const unlinkAccount = async (data: {
  providerId: string;
  accountId?: string;
}) => {
  await requireAuth();

  const result = await auth.api.unlinkAccount({
    body: {
      providerId: data.providerId,
      accountId: data.accountId,
    },
    headers: await headers(),
  });

  return result;
};

/**
 * Delete user account
 * Requires password or fresh session
 */
export const deleteUser = async (data?: {
  password?: string;
  callbackURL?: string;
}) => {
  await requireAuth();

  const result = await auth.api.deleteUser({
    body: {
      password: data?.password,
      callbackURL: data?.callbackURL || "/",
    },
    headers: await headers(),
  });

  return result;
};

