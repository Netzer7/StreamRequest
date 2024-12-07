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

    // Group items by requester phone number
    const itemsByUser = {};
    snapshot.docs.forEach(doc => {
      const item = { id: doc.id, ...doc.data() };
      if (!itemsByUser[item.requesterPhone]) {
        itemsByUser[item.requesterPhone] = [];
      }
      itemsByUser[item.requesterPhone].push(item);
    });

    const notificationsSent = [];
    const errors = [];

    // Helper function to format days text
    const formatDaysText = (days) => {
      return days === 1 ? "1 day" : `${days} days`;
    };

    // Helper function to format the notification message
    const formatExpiryMessage = (items) => {
      let messageBody = "The following items will expire soon:\n\n";
      
      // Sort items by expiry date
      items.sort((a, b) => a.expiresAt.toDate() - b.expiresAt.toDate());
      
      // List each item with a number and days until expiry
      items.forEach((item, index) => {
        const daysUntilExpiry = Math.ceil(
          (item.expiresAt.toDate() - now.toDate()) / (1000 * 60 * 60 * 24)
        );
        messageBody += `${index + 1}. "${item.title}" - ${formatDaysText(daysUntilExpiry)} left\n`;
      });
      
      // Add instructions for renewal and deletion
      messageBody += "\nTo keep an item for 3 more weeks, reply:";
      messageBody += "\nRENEW #";
      messageBody += "\n\nTo remove an item now, reply:";
      messageBody += "\nDELETE #";
      messageBody += "\n\n(Replace # with the item number)";
      
      return messageBody;
    };

    // Process notifications by user
    for (const [phone, items] of Object.entries(itemsByUser)) {
      try {
        // Create a single notification record for all items
        await adminDb.collection("expiryNotifications").add({
          libraryItemIds: items.map(item => item.id),
          titles: items.map(item => item.title),
          requesterPhone: phone,
          expiryDates: items.map(item => item.expiresAt),
          status: "pending",
          sentAt: now,
          itemCount: items.length,
          // Store the order of items for reference when processing responses
          itemOrder: items.map(item => ({
            id: item.id,
            title: item.title,
            expiresAt: item.expiresAt
          }))
        });

        // Send a single formatted SMS for all items
        await twilioClient.messages.create({
          to: phone,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: formatExpiryMessage(items)
        });

        notificationsSent.push({
          phone,
          itemCount: items.length,
          items: items.map(item => ({
            id: item.id,
            title: item.title,
            expiresAt: item.expiresAt
          }))
        });
      } catch (error) {
        console.error(`Error processing notifications for ${phone}:`, error);
        errors.push({
          phone,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      usersProcessed: Object.keys(itemsByUser).length,
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