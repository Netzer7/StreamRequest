import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import twilio from 'twilio'

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

export async function GET(req) {
  try {
    // Only allow requests with the correct API key
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get all pending media requests
    const mediaRequestsRef = collection(db, 'mediaRequests')
    const q = query(
      mediaRequestsRef,
      where('status', '==', 'pending')
    )
    
    const requestsSnapshot = await getDocs(q)
    
    // Group requests by managerId
    const requestsByManager = {}
    
    requestsSnapshot.forEach((doc) => {
      const request = doc.data()
      const managerId = request.managerId
      
      if (!requestsByManager[managerId]) {
        requestsByManager[managerId] = []
      }
      requestsByManager[managerId].push(request)
    })
    
    // If there are no pending requests, end early
    if (Object.keys(requestsByManager).length === 0) {
      return NextResponse.json({ 
        message: 'No pending requests found',
        notificationsSent: 0 
      })
    }

    // Get manager phone numbers and send notifications
    const notificationsSent = []
    
    for (const managerId in requestsByManager) {
      const requests = requestsByManager[managerId]
      
      // Get manager's phone number from users collection
      const usersRef = collection(db, 'users')
      const managerQuery = query(
        usersRef,
        where('userId', '==', managerId),
        where('role', '==', 'manager')
      )
      
      const managerSnapshot = await getDocs(managerQuery)
      
      if (!managerSnapshot.empty) {
        const managerData = managerSnapshot.docs[0].data()
        const phoneNumber = managerData.phoneNumber
        
        // Construct message
        const message = `StreamRequest: You have ${requests.length} pending media ${
          requests.length === 1 ? 'request' : 'requests'
        } awaiting your review. Login to your dashboard to manage them.`
        
        // Send SMS via Twilio
        try {
          await twilioClient.messages.create({
            body: message,
            to: phoneNumber,
            from: twilioPhoneNumber
          })
          
          notificationsSent.push({
            managerId,
            requestCount: requests.length,
            success: true
          })
        } catch (error) {
          console.error(`Failed to send notification to manager ${managerId}:`, error)
          notificationsSent.push({
            managerId,
            requestCount: requests.length,
            success: false,
            error: error.message
          })
        }
      }
    }

    return NextResponse.json({
      message: 'Notifications processed',
      notificationsSent
    })
  } catch (error) {
    console.error('Error processing notifications:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// Add a test endpoint to verify the notification system
export async function POST(req) {
  try {
    // This endpoint is for testing only
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Test endpoint not available in production', { 
        status: 403 
      })
    }

    // Verify test authorization
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get the managerId from the request body
    const { managerId } = await req.json()
    
    if (!managerId) {
      return new NextResponse('Manager ID is required', { status: 400 })
    }

    // Get manager's phone number
    const usersRef = collection(db, 'users')
    const managerQuery = query(
      usersRef,
      where('userId', '==', managerId),
      where('role', '==', 'manager')
    )
    
    const managerSnapshot = await getDocs(managerQuery)
    
    if (managerSnapshot.empty) {
      return new NextResponse('Manager not found', { status: 404 })
    }

    const managerData = managerSnapshot.docs[0].data()
    const phoneNumber = managerData.phoneNumber

    // Send test message
    const message = 'StreamRequest: This is a test notification. If you receive this, your notification system is working correctly.'
    
    await twilioClient.messages.create({
      body: message,
      to: phoneNumber,
      from: twilioPhoneNumber
    })

    return NextResponse.json({
      message: 'Test notification sent successfully',
      phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*') // Mask the phone number in response
    })

  } catch (error) {
    console.error('Error sending test notification:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}