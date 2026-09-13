import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Event from "@/models/Event";
import { setAuthCookie, getAuthUser } from "@/lib/authHelper";

export async function GET() {
  try {
    await connectDB();
    const userCount = await User.countDocuments();
    const authUser = await getAuthUser();

    return NextResponse.json({
      success: true,
      data: {
        adminExists: userCount > 0,
        isAdmin: authUser?.role === "admin",
        user: authUser
          ? { id: authUser._id, name: authUser.name, email: authUser.email, role: authUser.role }
          : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to check registration status." },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const userCount = await User.countDocuments();
    const authUser = await getAuthUser();

    // Registration wall: If users exist, creating an account requires an logged-in Admin session.
    if (userCount > 0 && (!authUser || authUser.role !== "admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. You must be logged in as an Admin to create accounts." },
        { status: 403 }
      );
    }

    const { name, email, password, role = "admin", eventIds = [] } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (!["admin", "team_member"].includes(role)) {
      return NextResponse.json(
        { success: false, message: "Invalid role specified." },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      createdBy: role === "team_member" && authUser ? authUser._id : undefined,
    });

    // If team member and eventIds provided, assign them to specified events
    if (role === "team_member" && Array.isArray(eventIds) && eventIds.length > 0 && authUser) {
      await Event.updateMany(
        { _id: { $in: eventIds }, createdBy: authUser._id },
        { $addToSet: { assignedTeam: user._id } }
      );
    }

    // If this is initial setup (0 users), log in as the newly created initial admin.
    // Otherwise, an admin created this account, so keep the admin's session active.
    if (userCount === 0) {
      await setAuthCookie(user);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Registration failed." },
      { status: 500 }
    );
  }
}
