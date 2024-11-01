// app/api/sms/route.js
import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const From = formData.get('From');
    const Body = formData.get('Body').toLowerCase();

    if (Body === 'yes') {
      // Find pending invitation for this number
      const pendingUsersRef = collection(db, 'pendingUsers');
      const q = query(pendingUsersRef, where('phoneNumber', '==', From), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const pendingUser = querySnapshot.docs[0];
        
        // Add to confirmed users collection
        await addDoc(collection(db, 'users'), {
          phoneNumber: From,
          managerId: pendingUser.data().managerId,
          status: 'active',
          createdAt: new Date().toISOString()
        });

        // Update pending status
        await updateDoc(pendingUser.ref, {
          status: 'confirmed'
        });

        // Send confirmation message
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await twilioClient.messages.create({
          body: 'You have been successfully registered! You can now send media requests to this number.',
          from: process.env.TWILIO_PHONE_NUMBER,
          to: From
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling SMS webhook:', error);
    return NextResponse.json({ error: 'Failed to process SMS' }, { status: 500 });
  }
}