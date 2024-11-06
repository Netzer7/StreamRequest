import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase-admin';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function POST(request) {
  try {
    console.log('Received SMS webhook');
    
    const formData = await request.formData();
    const body = Object.fromEntries(formData);
    
    console.log('SMS details:', {
      from: body.From,
      body: body.Body,
      timestamp: new Date().toISOString()
    });

    const messageBody = body.Body.toLowerCase().trim();
    
    // Handle user registration confirmation
    if (messageBody === 'yes') {
      return handleRegistration(body.From);
    }
    
    // Handle media request confirmation
    if (messageBody.startsWith('confirm')) {
      return handleConfirmation(body.From, messageBody);
    }
    
    // Handle new media request/search
    return handleMediaSearch(body.From, body.Body);
    
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

async function handleRegistration(phoneNumber) {
  try {
    const pendingUsersRef = adminDb.collection('pendingUsers');
    const query = await pendingUsersRef
      .where('phoneNumber', '==', phoneNumber)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (query.empty) {
      console.log('No pending invitation found for:', phoneNumber);
      return createTwiMLResponse('No pending invitation found. Please contact your media server administrator.');
    }

    const pendingUser = query.docs[0];
    const pendingData = pendingUser.data();
    
    console.log('Found pending user data:', pendingData); // Debug log

    // Create new user document with null check for nickname
    const newUserData = {
      phoneNumber,
      managerId: pendingData.managerId,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    // Only add nickname if it exists in pendingData
    if (pendingData.nickname) {
      newUserData.nickname = pendingData.nickname;
    }

    console.log('Creating new user with data:', newUserData); // Debug log

    await adminDb.collection('users').add(newUserData);

    await pendingUser.ref.update({
      status: 'confirmed',
      confirmedAt: new Date().toISOString()
    });

    console.log('User registration confirmed for:', phoneNumber);
    return createTwiMLResponse('Registration confirmed! You can now send media requests to this number.');
  } catch (error) {
    console.error('Registration error:', error);
    throw error; // Re-throw to be caught by the main error handler
  }
}

async function handleMediaSearch(phoneNumber, searchQuery) {
  // First check if user is registered
  const usersRef = adminDb.collection('users');
  const userQuery = await usersRef
    .where('phoneNumber', '==', phoneNumber)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (userQuery.empty) {
    return createTwiMLResponse('You are not registered to make media requests. Please contact your media server administrator.');
  }

  // Search TMDB
  const searchResults = await searchTMDB(searchQuery);
  
  if (searchResults.length === 0) {
    return createTwiMLResponse('No matches found. Please try another search term.');
  }

  // Store search results in user document
  const user = userQuery.docs[0];
  await user.ref.update({
    pendingSearch: {
      searchResults,
      timestamp: new Date().toISOString(),
      originalQuery: searchQuery
    }
  });

  // Format and send results
  const formattedResults = formatSearchResults(searchResults);
  return createTwiMLResponse(formattedResults);
}

async function handleConfirmation(phoneNumber, message) {
  const usersRef = adminDb.collection('users');
  const userQuery = await usersRef
    .where('phoneNumber', '==', phoneNumber)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (userQuery.empty) {
    return createTwiMLResponse('You are not registered to make media requests.');
  }

  const user = userQuery.docs[0];
  const userData = user.data();

  if (!userData.pendingSearch) {
    return createTwiMLResponse('No pending search found. Please start a new request.');
  }

  const selectionNumber = parseInt(message.split(' ')[1]) - 1;
  const selectedMedia = userData.pendingSearch.searchResults[selectionNumber];

  if (!selectedMedia) {
    return createTwiMLResponse('Invalid selection. Please choose a number from the list.');
  }

  // Create the media request
  await adminDb.collection('mediaRequests').add({
    ...selectedMedia,
    requesterId: user.id,
    requesterPhone: phoneNumber,
    requesterNickname: userData.nickname || null,
    managerId: userData.managerId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  // Clear the pending search
  await user.ref.update({
    pendingSearch: null
  });

  return createTwiMLResponse(`Your request for "${selectedMedia.title}" has been submitted and will be reviewed by your media server administrator.`);
}

async function searchTMDB(query) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error('TMDB API request failed');
    }

    const data = await response.json();
    
    return data.results
      .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
      .map(item => {
        // Create base object with required fields
        const mediaItem = {
          tmdbId: item.id,
          title: item.media_type === 'movie' ? item.title : item.name,
          mediaType: item.media_type,
          overview: item.overview ? item.overview.substring(0, 150) : 'No description available.'
        };

        // Add optional fields only if they exist
        if (item.media_type === 'movie' && item.release_date) {
          mediaItem.releaseYear = item.release_date.substring(0, 4);
        } else if (item.media_type === 'tv' && item.first_air_date) {
          mediaItem.releaseYear = item.first_air_date.substring(0, 4);
        }

        if (item.vote_average) {
          mediaItem.rating = item.vote_average.toFixed(1);
        }

        return mediaItem;
      })
      .slice(0, 5);
  } catch (error) {
    console.error('TMDB search error:', error);
    return [];
  }
}

function formatSearchResults(results) {
  const formattedResults = results
    .map((item, index) => {
      const year = item.releaseYear ? ` (${item.releaseYear})` : '';
      const type = item.mediaType === 'movie' ? 'Movie' : 'TV Show';
      const rating = item.rating ? ` • Rating: ${item.rating}/10` : '';
      
      return `${index + 1}. ${item.title}${year} - ${type}${rating}\n${item.overview}\n`;
    })
    .join('\n');

  return `Best matches found:\n\n${formattedResults}\nReply with "confirm X" to request (e.g., "confirm 1" for the first option)`;
}

function createTwiMLResponse(message) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    }
  );
}