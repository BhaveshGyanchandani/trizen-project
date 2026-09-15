import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/authHelper";

/**
 * POST /api/auth/logout
 *
 * Clears the current session's auth cookie, ending it. No request body.
 */
export async function POST() {
  try {
    await clearAuthCookie();
    return NextResponse.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Logout failed." },
      { status: 500 }
    );
  }
}
