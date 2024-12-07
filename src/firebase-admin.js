import { NextResponse } from "next/server";
import { headers } from "next/headers";
import twilio from "twilio";
import { adminDb } from "@/firebase-admin";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request) {
  try {
    // Debug environment variables (masking sensitive data)
    console.log("Environment check:", {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasTwilioToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasTwilioPhone: !!process.env.TWILIO_PHONE_NUMBER,
    });

    const headersList = headers();
    const authHeader = headersList.get("authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log("Auth mismatch:", {
        received: authHeader,
        expected: `Bearer ${process.env.CRON_SECRET}`
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get manager ID from request body
    const { managerId } = await request.json();
    console.log("Processing request for manager:", managerId);

    if (!managerId) {
      return NextResponse.json({ error: "Manager ID is required" }, { status: 400 });
    }

    // Verify adminDb is initialized
    if (!adminDb) {
      console.error("adminDb not initialized");
      return NextResponse.json(
        { error: "Database not initialized" },
        { status: 500 }
      );
    }

    // Get manager data
    console.log("Fetching manager data...");
    const managerDoc = await adminDb.collection("users").doc(managerId).get();

    if (!managerDoc.exists) {
      console.log("Manager not found:", managerId);
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    const managerData = managerDoc.data();
    console.log("Manager data retrieved:", {
      hasPhoneNumber: !!managerData.phoneNumber
    });

    // Send test message
    const message = "StreamRequest: This is a test notification. If you receive this, your notification system is working correctly.";
    
    await twilioClient.messages.create({
      body: message,
      to: managerData.phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    return NextResponse.json({
      success: true,
      message: "Test notification sent successfully",
      phoneNumber: managerData.phoneNumber.replace(/\d(?=\d{4})/g, '*')
    });

  } catch (error) {
    console.error("Error processing request:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    return NextResponse.json(
      {
        error: "Request failed",
        details: error.message,
        code: error.code
      },
      { status: 500 }
    );
  }
}