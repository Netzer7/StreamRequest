import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase-admin';
import twilio from 'twilio';

export async function POST(request) {
  try {
    console.log('Received SMS webhook');
    
    // Get the form data from the request
    const formData = await request.formData();
    const body = Object.fromEntries(formData);
    
    console.log('SMS details:', {
      from: body.From,
      body: body.Body,
      timestamp: new Date().toISOString()
    });

    // Convert to lowercase and trim for consistent comparison
    const messageBody = body.Body.toLowerCase().trim();
    
    if (messageBody === 'yes') {
      // Find the pending invitation for this phone number
      const pendingUsersRef = adminDb.collection('pendingUsers');
      const query = await pendingUsersRef
        .where('phoneNumber', '==', body.From)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (query.empty) {
        console.log('No pending invitation found for:', body.From);
        return new NextResponse(
          '<?xml version="1.0" encoding="UTF-8"?><Response><Message>No pending invitation found. Please contact your media server administrator.</Message></Response>',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/xml',
            },
          }
        );
      }

      const pendingUser = query.docs[0];
      const pendingData = pendingUser.data();

      // Add to confirmed users collection
      await adminDb.collection('users').add({
        phoneNumber: body.From,
        managerId: pendingData.managerId,
        status: 'active',
        createdAt: new Date().toISOString()
      });

      // Update pending status
      await pendingUser.ref.update({
        status: 'confirmed',
        confirmedAt: new Date().toISOString()
      });

      console.log('User registration confirmed for:', body.From);

      // Send confirmation message
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Registration confirmed! You can now send media requests to this number.</Message></Response>',
        {
          status: 200,
          headers: {
            'Content-Type': 'text/xml',
          },
        }
      );
    }

    // If message isn't 'yes', send instructions
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>To confirm registration, please reply with YES.</Message></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>An error occurred. Please try again later.</Message></Response>',
      {
        status: 500,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  }
}