import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        bio: user.bio || "",
        avatarUrl: user.avatarCloudinaryPublicId ? `/api/auth/avatar/${user._id}` : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch user." },
      { status: 500 }
    );
  }
}
