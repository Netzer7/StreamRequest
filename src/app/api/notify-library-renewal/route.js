import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { db } from '@/lib/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request) {
  try {
    const { itemId, newExpiryDate } = await request.json();

    // Get the library item
    const itemRef = doc(db, 'library', itemId);
    const itemDoc = await getDoc(itemRef);
    
    if (!itemDoc.exists()) {
      return NextResponse.json({ error: 'Library item not found' }, { status: 404 });
    }

    const item = itemDoc.data();
    
    // Get user details
    const userRef = doc(db, 'users', item.requesterPhone);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Format expiry date
    const expiryDate = new Date(newExpiryDate).toLocaleDateString();

    // Send notification
    await twilioClient.messages.create({
      to: item.requesterPhone,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: `Your media "${item.title}" has been renewed. It will now be available until ${expiryDate}.`
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending renewal notification:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}