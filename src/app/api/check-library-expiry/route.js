import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { db } from '@/lib/firebase/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// This function should be called by a CRON job daily
export async function GET() {
  try {
    const now = Timestamp.now();
    const threeDaysFromNow = Timestamp.fromDate(
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    );

    // Get items expiring in the next 3 days
    const q = query(
      collection(db, 'library'),
      where('expiresAt', '>', now),
      where('expiresAt', '<=', threeDaysFromNow)
    );

    const snapshot = await getDocs(q);
    
    for (const doc of snapshot.docs) {
      const item = doc.data();
      const daysUntilExpiry = Math.ceil(
        (item.expiresAt.toDate() - now.toDate()) / (1000 * 60 * 60 * 24)
      );

      // Send notification to user
      await twilioClient.messages.create({
        to: item.requesterPhone,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: `Your media "${item.title}" will expire in ${daysUntilExpiry} days. Reply "RENEW ${doc.id}" to keep it for another 3 weeks.`
      });
    }

    return NextResponse.json({ success: true, itemsProcessed: snapshot.size });
  } catch (error) {
    console.error('Error checking library expiry:', error);
    return NextResponse.json({ error: 'Failed to check library expiry' }, { status: 500 });
  }
}