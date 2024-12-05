import { NextResponse } from "next/server";
import { adminDb } from "@/firebase-admin";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { requestIds, action, isBatchApproval } = body;

    if (isBatchApproval) {
      // Handle batch approval
      const requestsSnapshot = await Promise.all(
        requestIds.map((id) =>
          adminDb.collection("mediaRequests").doc(id).get()
        )
      );

      // Group requests by phone number
      const requestsByPhone = requestsSnapshot.reduce((acc, doc) => {
        if (doc.exists) {
          const data = doc.data();
          if (!acc[data.requesterPhone]) {
            acc[data.requesterPhone] = [];
          }
          acc[data.requesterPhone].push(data.title);
        }
        return acc;
      }, {});

      // Send consolidated messages to each user
      await Promise.all(
        Object.entries(requestsByPhone).map(async ([phone, titles]) => {
          let message;
          if (titles.length === 1) {
            message = `Your request for "${titles[0]}" has been approved! It will be added to the library soon.`;
          } else if (titles.length === 2) {
            message = `Your requests for "${titles[0]}" and "${titles[1]}" have been approved! They will be added to the library soon.`;
          } else {
            const lastTitle = titles.pop();
            message = `Your requests for "${titles.join('", "')}", and "${lastTitle}" have been approved! They will be added to the library soon.`;
          }

          await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone,
          });
        })
      );

      return NextResponse.json({ success: true });
    } else {
      // Handle single request (existing logic)
      const { requestId, action } = body;

      const requestDoc = await adminDb
        .collection("mediaRequests")
        .doc(requestId)
        .get();
      if (!requestDoc.exists) {
        return NextResponse.json(
          { error: "Request not found" },
          { status: 404 }
        );
      }

      const requestData = requestDoc.data();

      let statusMessage;
      if (action === "approved") {
        statusMessage = `Your request for "${requestData.title}" has been approved! It will be added to the library soon.`;
      } else if (action === "rejected") {
        statusMessage = `Your request for "${requestData.title}" has been declined. Please contact your media server administrator for more information.`;
      } else if (action === "expired") {
        statusMessage = `"${requestData.title}" has been removed from the library. Contact your media server administrator if you need it restored.`;
      }

      await client.messages.create({
        body: statusMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: requestData.requesterPhone,
      });

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
