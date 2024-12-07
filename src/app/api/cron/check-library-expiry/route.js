import { NextResponse } from "next/server";
import { headers } from "next/headers";
import twilio from "twilio";
import { adminDb } from "@/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request) {
  try {
    const headersList = headers();
    const authHeader = headersList.get("authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Checking for media items expiring in the next 3 days...");

    const now = Timestamp.now();
    const threeDaysFromNow = Timestamp.fromDate(
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    );

    // Using adminDb methods directly instead of query constructor
    const snapshot = await adminDb
      .collection("library")
      .where("status", "==", "active")
      .where("expiresAt", ">", now)
      .where("expiresAt", "<=", threeDaysFromNow)
      .get();

    if (snapshot.empty) {
      console.log("No media items found expiring in the next 3 days");
      return NextResponse.json({
        success: true,
        message: "No media items require expiry notifications at this time",
        itemsProcessed: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const notificationsSent = [];
    const errors = [];

    for (const doc of snapshot.docs) {
      try {
        const item = doc.data();
        const daysUntilExpiry = Math.ceil(
          (item.expiresAt.toDate() - now.toDate()) / (1000 * 60 * 60 * 24)
        );

        // Create notification record
        await adminDb.collection("expiryNotifications").add({
          libraryItemId: doc.id,
          title: item.title,
          requesterPhone: item.requesterPhone,
          expiryDate: item.expiresAt,
          status: "pending",
          sentAt: now,
          daysUntilExpiry,
        });

        // Send SMS notification
        await twilioClient.messages.create({
          to: item.requesterPhone,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: `Your media "${item.title}" will expire in ${daysUntilExpiry} days. Reply RENEW to keep it for another 3 weeks.`,
        });

        notificationsSent.push({
          id: doc.id,
          title: item.title,
          daysUntilExpiry,
        });
      } catch (error) {
        console.error(`Error processing item ${doc.id}:`, error);
        errors.push({
          id: doc.id,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      itemsProcessed: snapshot.size,
      notificationsSent,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking library expiry:", error);
    return NextResponse.json(
      {
        error: "Failed to check library expiry",
        details: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
