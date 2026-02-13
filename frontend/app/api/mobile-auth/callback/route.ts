import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Mobile Auth Callback
 * After successful Google/GitHub login, this endpoint generates a session token
 * and redirects back to the mobile app with the token
 */
export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      // No session found - redirect to login
      const redirectUri = request.nextUrl.searchParams.get("redirect_uri") || "pulsecam://auth/callback";
      const state = request.nextUrl.searchParams.get("state") || "";
      
      return NextResponse.redirect(
        `${redirectUri}?error=not_authenticated&state=${state}`
      );
    }

    // Session exists - create a session token for the mobile app
    const { user, session: sessionData } = session;
    
    // Get redirect parameters
    const redirectUri = request.nextUrl.searchParams.get("redirect_uri") || "pulsecam://auth/callback";
    const state = request.nextUrl.searchParams.get("state") || "";

    // Build the redirect URL with session token
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set("token", sessionData.token);
    redirectUrl.searchParams.set("user_id", user.id);
    redirectUrl.searchParams.set("email", user.email);
    redirectUrl.searchParams.set("name", user.name || "");
    if (state) {
      redirectUrl.searchParams.set("state", state);
    }

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("Mobile auth callback error:", error);
    
    const redirectUri = request.nextUrl.searchParams.get("redirect_uri") || "pulsecam://auth/callback";
    const state = request.nextUrl.searchParams.get("state") || "";
    
    return NextResponse.redirect(
      `${redirectUri}?error=server_error&state=${state}`
    );
  }
}
