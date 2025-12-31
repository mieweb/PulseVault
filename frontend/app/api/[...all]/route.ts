import { auth } from "../../../lib/auth"; // path to your auth file
import { toNextJsHandler } from "better-auth/next-js";
import arcjet, {
  ArcjetDecision,
  BotOptions,
  detectBot,
  shield,
  slidingWindow,
  SlidingWindowRateLimitOptions,
} from "@arcjet/next";
import { getSession } from "@/lib/get-session";
import { findIp } from "@arcjet/ip";

const aj = arcjet({
  key: process.env.ARCJET_API_KEY!,
  characteristics: ["userIdOrIp"],
  rules: [shield({ mode: "LIVE" })],
});

const botSettings = { mode: "LIVE", allow: [] } satisfies BotOptions;
// Restrictive rate limit for auth endpoints (SSO redirects, callbacks)
const authRateLimitSettings = {
  mode: "LIVE",
  max: 10,
  interval: "10m",
} satisfies SlidingWindowRateLimitOptions<[]>;
// More lenient rate limit for other auth API calls
const generalRateLimitSettings = {
  mode: "LIVE",
  max: 60,
  interval: "1m",
} satisfies SlidingWindowRateLimitOptions<[]>;

const authHandlers = toNextJsHandler(auth);
export const { GET } = authHandlers;

export async function POST(request: Request) {
  const decision = await checkArcjet(request);
  const clonedRequest = request.clone();

  if (decision instanceof ArcjetDecision && decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return new Response("Too many requests", { status: 429 });
    } else {
      return new Response("Forbidden", { status: 403 });
    }
  }

  return authHandlers.POST(clonedRequest);
}

async function checkArcjet(request: Request) {
  const session = await getSession();
  const userIdOrIp = session?.user?.id ?? (findIp(request) || "127.0.0.1");

  // Apply stricter rate limiting and bot protection to auth endpoints
  // This protects SSO redirects and OAuth callbacks from abuse
  if (request.url.endsWith("/auth")) {
    return aj
      .withRule(detectBot(botSettings))
      .withRule(slidingWindow(authRateLimitSettings))
      .protect(request, { userIdOrIp });
  }

  // More lenient rate limiting for other auth API calls
  return aj
    .withRule(detectBot(botSettings))
    .withRule(slidingWindow(generalRateLimitSettings))
    .protect(request, { userIdOrIp });
}
