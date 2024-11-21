import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase-admin';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export async function POST(request) {
  try {
    const { userId } = await request.json();
    
    // Fetch user details from Firestore admin SDK
    const userSnap = await adminDb.collection('users').doc(userId).get();
    const userData = userSnap.data();

    if (!userData || !userData.phoneNumber) {
      return NextResponse.json(
        { error: 'User not found or missing phone number' },
        { status: 404 }
      );
    }

    // Format phone number for Twilio (must be in E.164 format)
    const formattedPhone = `+1${userData.phoneNumber.replace(/\D/g, '')}`;

    // Send SMS notification
    await client.messages.create({
      body: `You have been removed from your StreamRequest group. If you believe this was a mistake, please contact the administrator.`,
      to: formattedPhone,
      from: twilioPhoneNumber
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending removal notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}