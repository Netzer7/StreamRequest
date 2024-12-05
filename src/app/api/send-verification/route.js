import twilio from "twilio";
import { NextResponse } from "next/server";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request) {
  try {
    const { phoneNumber } = await request.json();

    // Format phone number to E.164 format
    let formattedNumber = phoneNumber.replace(/\D/g, ""); // Remove non-digits
    if (!formattedNumber.startsWith("1")) {
      formattedNumber = "1" + formattedNumber; // Add US country code if not present
    }
    formattedNumber = "+" + formattedNumber; // Add plus sign

    console.log("Attempting verification for:", formattedNumber); // Debug log

    const verification = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: formattedNumber,
        channel: "sms",
      });

    console.log("Verification response:", verification); // Debug log

    return NextResponse.json({
      success: true,
      status: verification.status,
    });
  } catch (error) {
    console.error("Twilio API Error details:", {
      status: error.status,
      code: error.code,
      message: error.message,
      moreInfo: error.moreInfo,
    });

    return NextResponse.json(
      {
        error: error.message || "Failed to send verification code",
        code: error.code,
        moreInfo: error.moreInfo,
      },
      { status: error.status || 500 }
    );
  }
}
