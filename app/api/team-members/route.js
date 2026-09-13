import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthUser } from "@/lib/authHelper";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    await connectDB();
    const members = await User.find({ createdBy: user._id }).select(
      "-password"
    );

    return NextResponse.json({
      success: true,
      data: members.map((m) => ({
        id: m._id,
        name: m.name,
        email: m.email,
        role: m.role,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch team members." },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    await connectDB();
    const { name, email, password, role = "team_member" } = await req.json();

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
        { success: false, message: "A user with this email already exists." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newMember = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      createdBy: user._id,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newMember._id,
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to add user." },
      { status: 500 }
    );
  }
}
