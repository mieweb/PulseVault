"use server";

import { headers } from "next/headers";
import { auth } from "../auth";
import { getSession } from "../get-session";
import { forbidden, unauthorized } from "next/navigation";
import { API_KEY_EXPIRY_PRESETS } from "../constants/api-key";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) unauthorized();
  const userRole = session.user.role;
  if (userRole !== "admin") forbidden();
  return session;
}

export type CreateApiKeyResult =
  | { success: true; key: string; id: string; name: string; prefix?: string }
  | { success: false; error: string };

/**
 * Create an API key for an external app (Admin only).
 * The secret key is returned only once; store it securely in the other app.
 */
export async function createApiKeyForApp(data: {
  name: string;
  appUrl?: string;
  description?: string;
  expiresIn?: keyof typeof API_KEY_EXPIRY_PRESETS | null;
}): Promise<CreateApiKeyResult> {
  await requireAdmin();
  const h = await headers();
  try {
    const metadata: { appUrl?: string; description?: string } = {};
    if (data.appUrl?.trim()) metadata.appUrl = data.appUrl.trim();
    if (data.description?.trim()) metadata.description = data.description.trim();
    const expiresInSeconds =
      data.expiresIn && data.expiresIn !== "none"
        ? API_KEY_EXPIRY_PRESETS[data.expiresIn]
        : undefined;
    const result = await auth.api.createApiKey({
      body: {
        name: data.name.trim(),
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        prefix: "pv_",
        ...(expiresInSeconds != null && { expiresIn: expiresInSeconds }),
      },
      headers: h,
    });
    if (!result?.key) {
      return { success: false, error: "Failed to create API key" };
    }
    return {
      success: true,
      key: result.key,
      id: result.id,
      name: result.name ?? data.name,
      prefix: result.prefix ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create API key";
    return { success: false, error: message };
  }
}

export type ApiKeyEntry = {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  metadata: { appUrl?: string; description?: string } | null;
  createdAt: Date;
  expiresAt: Date | null;
  enabled: boolean;
};

export type ListApiKeysResult =
  | { success: true; apiKeys: ApiKeyEntry[]; total: number }
  | { success: false; error: string };

/**
 * List API keys for the current user (Admin only).
 * The secret key value is never returned.
 */
export async function listApiKeysForAdmin(): Promise<ListApiKeysResult> {
  await requireAdmin();
  const h = await headers();
  try {
    const result = await auth.api.listApiKeys({
      query: { sortBy: "createdAt", sortDirection: "desc" },
      headers: h,
    });
    const apiKeys = (result?.apiKeys ?? []).map((k: Record<string, unknown>) => ({
      id: k.id as string,
      name: (k.name as string) ?? null,
      start: (k.start as string) ?? null,
      prefix: (k.prefix as string) ?? null,
      metadata: (k.metadata as { appUrl?: string; description?: string } | null) ?? null,
      createdAt: k.createdAt as Date,
      expiresAt: (k.expiresAt as Date) ?? null,
      enabled: (k.enabled as boolean) ?? true,
    }));
    return {
      success: true,
      apiKeys,
      total: (result?.total as number) ?? apiKeys.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list API keys";
    return { success: false, error: message };
  }
}

export type DeleteApiKeyResult = { success: true } | { success: false; error: string };

/**
 * Revoke (delete) an API key (Admin only).
 */
export async function revokeApiKey(keyId: string): Promise<DeleteApiKeyResult> {
  await requireAdmin();
  const h = await headers();
  try {
    await auth.api.deleteApiKey({
      body: { keyId },
      headers: h,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revoke API key";
    return { success: false, error: message };
  }
}
