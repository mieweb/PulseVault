import { auth } from "../../../lib/auth"; // path to your auth file
import { toNextJsHandler } from "better-auth/next-js";
import arcjet, {
  ArcjetDecision,
  BotOptions,
  detectBot,
  EmailOptions,
  protectSignup,
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
const restrictiveRateLimitSettings = {
  mode: "LIVE",
  max: 10,
  interval: "10m",
} satisfies SlidingWindowRateLimitOptions<[]>;
const laxRateLimitSettings = {
  mode: "LIVE",
  max: 60,
  interval: "1m",
} satisfies SlidingWindowRateLimitOptions<[]>;
const emailSettings = {
  mode: "LIVE",
  block: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
} satisfies EmailOptions;

const authHandlers = toNextJsHandler(auth);
export const { GET } = authHandlers;

export async function POST(request: Request) {
  const decision = await checkArcjet(request);
  const clonedRequest = request.clone();

  if (decision instanceof ArcjetDecision && decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return new Response(null, { status: 429 });
    } else if (decision.reason.isEmail()) {
      let message: string;

      if (decision.reason.emailTypes.includes("INVALID")) {
        message = "Invalid email address is not allowed";
      } else if (decision.reason.emailTypes.includes("DISPOSABLE")) {
        message = "Disposable email address is not allowed";
      } else if (decision.reason.emailTypes.includes("NO_MX_RECORDS")) {
        message = "No MX records found for email address";
      } else {
        message = "Invalid email address";
      }

      return new Response(message, { status: 400 });
    } else {
      return new Response(null, { status: 403 });
    }
  }

  return authHandlers.POST(clonedRequest);
}

async function checkArcjet(request: Request) {
  const body = (await request.json()) as unknown;
  const session = await getSession();
  const userIdOrIp = session?.user?.id ?? (findIp(request) || "127.0.0.1");

  if (request.url.endsWith("/auth")) {
    if (
      body &&
      typeof body === "object" &&
      "email" in body &&
      typeof body.email === "string"
    ) {
      return aj.withRule(
        protectSignup({
          email: emailSettings,
          bots: botSettings,
          rateLimit: restrictiveRateLimitSettings,
        })
      );
    } else {
      return aj
        .withRule(detectBot(botSettings))
        .withRule(slidingWindow(restrictiveRateLimitSettings))
        .protect(request, { userIdOrIp });
    }
  }

  return aj
    .withRule(detectBot(botSettings))
    .withRule(slidingWindow(laxRateLimitSettings))
    .protect(request, { userIdOrIp });
}
