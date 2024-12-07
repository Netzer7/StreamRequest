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

    // First, try a test query to verify adminDb connection and permissions
    console.log("Testing adminDb connection...");
    const testQuery = await adminDb.collection("library").limit(1).get();
    console.log("Admin DB connection test successful");

    // Now proceed with the actual notification logic
    const snapshot = await adminDb
      .collection("mediaRequests")
      .where("status", "==", "pending")
      .get();

    console.log(`Found ${snapshot.size} pending requests`);

    const notificationsSent = [];
    const errors = [];

    // Group requests by manager
    const requestsByManager = {};
    snapshot.docs.forEach((doc) => {
      const request = doc.data();
      const managerId = request.managerId;
      if (!requestsByManager[managerId]) {
        requestsByManager[managerId] = [];
      }
      requestsByManager[managerId].push({
        id: doc.id,
        ...request,
      });
    });

    // Process each manager's requests
    for (const managerId of Object.keys(requestsByManager)) {
      try {
        const requests = requestsByManager[managerId];
        console.log(
          `Processing ${requests.length} requests for manager ${managerId}`
        );

        // Get manager info
        const managerDoc = await adminDb
          .collection("users")
          .doc(managerId)
          .get();

        if (!managerDoc.exists) {
          console.log(`Manager ${managerId} not found`);
          continue;
        }

        const managerData = managerDoc.data();

        // Send notification
        const message = `StreamRequest: You have ${requests.length} pending media ${
          requests.length === 1 ? "request" : "requests"
        } awaiting your review. Login to your dashboard to manage them.`;

        await twilioClient.messages.create({
          body: message,
          to: managerData.phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER,
        });

        notificationsSent.push({
          managerId,
          requestCount: requests.length,
          success: true,
        });
      } catch (error) {
        console.error(`Error processing manager ${managerId}:`, error);
        errors.push({
          managerId,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      managersProcessed: Object.keys(requestsByManager).length,
      notificationsSent,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Full error:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      {
        error: "Failed to process notifications",
        details: error.message,
        code: error.code,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
