import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase-admin';
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request) {
  try {
    const { requestId, action } = await request.json();
    
    // Get the request details
    const requestDoc = await adminDb.collection('mediaRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    
    const requestData = requestDoc.data();
    
    // Construct message based on action and request title
    let statusMessage;
    if (action === 'approved') {
      statusMessage = `Your request for "${requestData.title}" has been approved! It will be added to the library soon.`;
    } else if (action === 'rejected') {
      statusMessage = `Your request for "${requestData.title}" has been declined. Please contact your media server administrator for more information.`;
    } else if (action === 'expired') {
      statusMessage = `"${requestData.title}" has been removed from the library. Contact your media server administrator if you need it restored.`;
    }

    // Send SMS notification
    await client.messages.create({
      body: statusMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: requestData.requesterPhone
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}