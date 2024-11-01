import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { adminDb } from '@/firebase-admin';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export async function POST(request) {
  try {
    console.log('Starting invite process...');
    const { phoneNumber, managerId } = await request.json();
    console.log('Received data:', { phoneNumber, managerId });

    // Format phone number to E.164
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    const e164Number = `+1${formattedNumber}`;
    console.log('Formatted phone number:', e164Number);

    try {
      // Log environment variables (without showing actual values)
      console.log('Environment check:', {
        hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY
      });

      console.log('Attempting to add to Firestore...');
      const docRef = await adminDb.collection('pendingUsers').add({
        phoneNumber: e164Number,
        managerId: managerId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      console.log('Successfully added to Firestore:', docRef.id);

      console.log('Attempting to send SMS...');
      const message = await client.messages.create({
        body: `You've been invited to join a Plex media library! Reply YES to confirm your registration.`,
        from: twilioNumber,
        to: e164Number
      });
      console.log('SMS sent successfully:', message.sid);

      return NextResponse.json({ 
        success: true, 
        message: 'Invitation sent successfully',
        docId: docRef.id
      });
    } catch (error) {
      console.error('Operation error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Full error object:', error);
    console.error('Error stack trace:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to send invitation', 
        details: error.message,
        type: error.code || 'unknown'
      },
      { status: 500 }
    );
  }
}