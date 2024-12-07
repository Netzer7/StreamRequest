import { NextResponse } from "next/server";
import { headers } from "next/headers";
import twilio from "twilio";
import { adminDb } from "@/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request) {
  try {
    const headersList = headers();
    const authHeader = headersList.get("authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Test adminDb connection first
    try {
      console.log("Testing adminDb connection...");
      const testQuery = await adminDb.collection("mediaRequests").limit(1).get();
      console.log("Test query successful");
    } catch (dbError) {
      console.error("Database connection test failed:", {
        error: dbError.message,
        code: dbError.code,
        stack: dbError.stack
      });
      throw dbError;
    }

    // Get the managerId from the request body
    const { managerId } = await request.json();
    
    if (!managerId) {
      return NextResponse.json(
        { error: "Manager ID is required" }, 
        { status: 400 }
      );
    }

    // Get manager data directly using adminDb
    const managerDoc = await adminDb
      .collection("users")
      .doc(managerId)
      .get();

    if (!managerDoc.exists) {
      return NextResponse.json(
        { error: "Manager not found" }, 
        { status: 404 }
      );
    }

    const managerData = managerDoc.data();
    const phoneNumber = managerData.phoneNumber;

    // Send test message
    const message = 'StreamRequest: This is a test notification. If you receive this, your notification system is working correctly.';
    
    await twilioClient.messages.create({
      body: message,
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully',
      phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask the phone number
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json(
      {
        error: "Failed to send test notification",
        details: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

// The actual cron endpoint for checking pending requests
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

    // Group requests by managerId
    const requestsByManager = {};
    
    snapshot.forEach((doc) => {
      const request = doc.data();
      const managerId = request.managerId;
      
      if (!requestsByManager[managerId]) {
        requestsByManager[managerId] = [];
      }
      requestsByManager[managerId].push(request);
    });

    const notificationsSent = [];
    const errors = [];

    // Send notifications to each manager
    for (const managerId in requestsByManager) {
      try {
        const requests = requestsByManager[managerId];
        
        // Get manager's data
        const managerDoc = await adminDb
          .collection("users")
          .doc(managerId)
          .get();
        
        if (managerDoc.exists) {
          const managerData = managerDoc.data();
          const phoneNumber = managerData.phoneNumber;
          
          // Construct and send message
          const message = `StreamRequest: You have ${requests.length} pending media ${
            requests.length === 1 ? 'request' : 'requests'
          } awaiting your review. Login to your dashboard to manage them.`;
          
          await twilioClient.messages.create({
            body: message,
            to: phoneNumber,
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
      {
        status: 500,
      }
    );
  }
}