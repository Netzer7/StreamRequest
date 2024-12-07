// app/api/cron/notify-pending-requests/route.js
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import twilio from "twilio";
import { adminDb } from "@/firebase-admin";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function GET(request) {
  try {
    const headersList = headers();
    const authHeader = headersList.get("authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all pending media requests
    const snapshot = await adminDb
      .collection("mediaRequests")
      .where("status", "==", "pending")
      .get();

    const notificationsSent = [];
    const errors = [];

    // Process each request and group by manager
    const requestsByManager = {};
    snapshot.forEach((doc) => {
      const request = doc.data();
      if (!requestsByManager[request.managerId]) {
        requestsByManager[request.managerId] = [];
      }
      requestsByManager[request.managerId].push(request);
    });

    // Send notifications to each manager
    for (const managerId in requestsByManager) {
      try {
        const requests = requestsByManager[managerId];
        const managerDoc = await adminDb
          .collection("users")
          .doc(managerId)
          .get();

        if (managerDoc.exists) {
          const managerData = managerDoc.data();
          const message = `StreamRequest: You have ${requests.length} pending media ${
            requests.length === 1 ? 'request' : 'requests'
          } awaiting your review. Login to your dashboard to manage them.`;

          await twilioClient.messages.create({
            body: message,
            to: managerData.phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER
          });

          notificationsSent.push({
            managerId,
            requestCount: requests.length,
            success: true
          });
        }
      } catch (error) {
        console.error(`Error processing manager ${managerId}:`, error);
        errors.push({
          managerId,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      managersProcessed: Object.keys(requestsByManager).length,
      notificationsSent,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error processing notifications:", error);
    return NextResponse.json(
      {
        error: "Failed to process notifications",
        details: error.message,
      },
      { status: 500 }
    );
  }
}