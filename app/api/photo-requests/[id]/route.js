import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Event from "@/models/Event";
import Photo from "@/models/Photo";
import PhotoChangeRequest from "@/models/PhotoChangeRequest";
import { getAuthUser, isEventOwner } from "@/lib/authHelper";
import mongoose from "mongoose";

export async function PATCH(req, { params }) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin access required." }, { status: 403 });
    }
    const { status } = await req.json();
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ success: false, message: "Choose APPROVED or REJECTED." }, { status: 400 });
    }
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Request not found." }, { status: 404 });
    }
    await connectDB();
    const request = await PhotoChangeRequest.findById(id);
    if (!request) return NextResponse.json({ success: false, message: "Request not found." }, { status: 404 });
    const event = await Event.findById(request.eventId);
    if (!event || !isEventOwner(event, user)) {
      return NextResponse.json({ success: false, message: "You don't have access to this request." }, { status: 403 });
    }
    if (request.status !== "PENDING") {
      return NextResponse.json({ success: false, message: "This request has already been reviewed." }, { status: 409 });
    }

    request.status = status;
    await request.save();
    if (status === "APPROVED") {
      // Keep the original asset/admin record, but remove it from the live
      // gallery immediately. It can never be served publicly while excluded.
      await Photo.findByIdAndUpdate(request.photoId, {
        $set: { excludedFromGallery: true, selectedForGallery: false, publishedForGallery: false },
      });
    }
    return NextResponse.json({ success: true, data: { id: request._id, status: request.status } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message || "Couldn't update the request." }, { status: 500 });
  }
}
