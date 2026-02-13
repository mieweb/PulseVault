import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Mobile Logout Endpoint
 * Clears the session and redirects back to mobile app
 */
export async function POST(request: NextRequest) {
  try {
    // Revoke the session
    await auth.api.signOut({
      headers: request.headers,
    });

    return NextResponse.json({ 
      success: true,
      message: "Logged out successfully" 
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for convenience (can call from browser)
 */
export async function GET(request: NextRequest) {
  try {
    await auth.api.signOut({
      headers: request.headers,
    });

    const redirectUri = request.nextUrl.searchParams.get("redirect_uri");
    
    if (redirectUri) {
      return NextResponse.redirect(redirectUri);
    }

    return NextResponse.json({ 
      success: true,
      message: "Logged out successfully. You can close this window." 
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}
