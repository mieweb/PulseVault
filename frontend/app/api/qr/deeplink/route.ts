import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

const API_KEY_HEADER = "x-api-key";
const BEARER_PREFIX = "Bearer ";

function getApiKeyFromRequest(request: Request): string | null {
  const header = request.headers.get(API_KEY_HEADER);
  if (header?.trim()) return header.trim();
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith(BEARER_PREFIX)) {
    return authHeader.slice(BEARER_PREFIX.length).trim();
  }
  return null;
}

type DeeplinkParams = {
  draftId?: string | null;
  userId?: string | null;
  server?: string | null;
  expiresIn?: number;
  oneTimeUse?: boolean;
  externalApp?: string | null;
  externalUserEmail?: string | null;
  externalUserId?: string | null;
};

/**
 * GET /api/qr/deeplink — Query: draftId?, userId?, server?, expiresIn?, oneTimeUse?, externalApp?, externalUserEmail?, externalUserId?
 * POST /api/qr/deeplink — Body (JSON): same fields.
 *
 * Auth: X-API-Key or Authorization: Bearer <key> (no session).
 * For external apps (e.g. Time Harbour): pass externalApp (e.g. "timeharbour") and externalUserEmail (or externalUserId)
 * so the token carries them and storage gets "Uploaded via X" / "by ..." for the dashboard.
 */
async function handleRequest(
  request: Request,
  searchParams: URLSearchParams,
  bodyParams: DeeplinkParams | null
) {
  const apiKey = getApiKeyFromRequest(request);
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing API key. Use X-API-Key or Authorization: Bearer <key>.",
      },
      { status: 401 }
    );
  }

  let verified: Awaited<ReturnType<typeof auth.api.verifyApiKey>>;
  try {
    verified = await auth.api.verifyApiKey({
      body: { key: apiKey },
    });
  } catch (err) {
    console.error("API key verification error:", err);
    return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
  }

  if (!verified.valid || verified.error) {
    const message =
      verified.error?.message != null
        ? String(verified.error.message)
        : "Invalid API key.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const backendUrl = process.env.BACKEND_URL;
  const defaultServer = process.env.BETTER_AUTH_URL?.replace(/\/$/, "");
  if (!backendUrl || !defaultServer) {
    console.error("Missing BACKEND_URL or BETTER_AUTH_URL");
    return NextResponse.json(
      { error: "Server misconfiguration." },
      { status: 500 }
    );
  }

  const draftId =
    bodyParams?.draftId?.trim() ||
    searchParams.get("draftId")?.trim() ||
    uuidv4();
  const userId =
    bodyParams?.userId?.trim() ||
    searchParams.get("userId")?.trim() ||
    "anonymous";
  const server =
    bodyParams?.server?.trim() ||
    searchParams.get("server")?.trim() ||
    defaultServer;
  const expiresIn =
    bodyParams?.expiresIn ??
    (() => {
      const q = searchParams.get("expiresIn");
      if (q == null) return undefined;
      const n = Number(q);
      return Number.isNaN(n) ? undefined : n;
    })();
  const oneTimeUse =
    bodyParams?.oneTimeUse ??
    (() => {
      const q = searchParams.get("oneTimeUse");
      if (q == null) return undefined;
      return q === "true" || q === "1";
    })();
  const externalApp =
    bodyParams?.externalApp?.trim() || searchParams.get("externalApp")?.trim() || null;
  const externalUserEmail =
    bodyParams?.externalUserEmail?.trim() ||
    searchParams.get("externalUserEmail")?.trim() ||
    null;
  const externalUserId =
    bodyParams?.externalUserId?.trim() ||
    searchParams.get("externalUserId")?.trim() ||
    null;

  const qs = new URLSearchParams({
    userId,
    draftId,
    server,
  });
  if (expiresIn != null) qs.set("expiresIn", String(expiresIn));
  if (oneTimeUse === true) qs.set("oneTimeUse", "true");
  if (externalApp != null) qs.set("externalApp", externalApp);
  if (externalUserEmail != null) qs.set("externalUserEmail", externalUserEmail);
  if (externalUserId != null) qs.set("externalUserId", externalUserId);

  const backendRes = await fetch(`${backendUrl}/qr/deeplink?${qs.toString()}`, {
    method: "GET",
  });

  if (!backendRes.ok) {
    const text = await backendRes.text();
    console.error("Backend /qr/deeplink error:", backendRes.status, text);
    return NextResponse.json(
      { error: "Failed to generate deeplink." },
      { status: 502 }
    );
  }

  const data = (await backendRes.json()) as Record<string, unknown>;
  return NextResponse.json(data);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return handleRequest(request, searchParams, null);
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  let bodyParams: DeeplinkParams | null = null;
  try {
    bodyParams = (await request.json()) as DeeplinkParams;
  } catch {
    // optional body
  }
  return handleRequest(request, searchParams, bodyParams);
}
