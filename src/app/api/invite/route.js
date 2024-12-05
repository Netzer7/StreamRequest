import { NextResponse } from "next/server";
import twilio from "twilio";
import { adminDb } from "@/firebase-admin";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export async function POST(request) {
  try {
    const { phoneNumber, managerId, nickname } = await request.json();
    console.log("Invite request data:", { phoneNumber, managerId, nickname }); // Debug log

    // Format phone number to E.164
    const formattedNumber = phoneNumber.replace(/\D/g, "");
    const e164Number = `+1${formattedNumber}`;

    // Create pending user document
    const pendingUserData = {
      phoneNumber: e164Number,
      managerId,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // Only add nickname if it exists and isn't empty
    if (nickname && nickname.trim()) {
      pendingUserData.nickname = nickname.trim();
    }

    console.log("Creating pending user with data:", pendingUserData); // Debug log

    const docRef = await adminDb
      .collection("pendingUsers")
      .add(pendingUserData);

    // Send invitation SMS
    const message = await client.messages.create({
      body: `Hi${nickname ? ` ${nickname}` : ""}! You've been invited to join a Plex media library! Reply YES to confirm your registration.`,
      from: twilioNumber,
      to: e164Number,
    });

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      docId: docRef.id,
    });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
