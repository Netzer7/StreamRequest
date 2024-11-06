import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { db } from '@/firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function POST(request) {
  try {
    const { Body: messageBody, From: phoneNumber } = await request.json();

    // Get the user document to check if they're registered and get their manager ID
    const userRef = doc(db, 'users', phoneNumber);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return sendMessage(
        phoneNumber,
        'You are not registered to make requests. Please contact your media server owner.'
      );
    }

    // Handle confirmation messages (when user is selecting from search results)
    if (messageBody.toLowerCase().startsWith('confirm')) {
      return handleConfirmation(phoneNumber, messageBody, userDoc.data());
    }

    // Handle new search requests
    const searchResults = await searchTMDB(messageBody);
    
    if (searchResults.length === 0) {
      return sendMessage(
        phoneNumber,
        'No matches found. Please try another search term.'
      );
    }

    // Store search results temporarily in the user's document
    await updateDoc(userRef, {
      pendingSearch: {
        searchResults,
        timestamp: new Date().toISOString(),
        originalQuery: messageBody
      }
    });

    // Send results to user
    const responseMessage = formatSearchResults(searchResults);
    return sendMessage(phoneNumber, responseMessage);

  } catch (error) {
    console.error('Error handling SMS:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
    
    // Filter and format results
    return data.results
      .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
      .map(item => ({
        tmdbId: item.id,
        title: item.media_type === 'movie' ? item.title : item.name,
        mediaType: item.media_type,
        posterPath: item.poster_path,
        releaseYear: item.media_type === 'movie' 
          ? (item.release_date || '').substring(0, 4)
          : (item.first_air_date || '').substring(0, 4),
        overview: item.overview?.substring(0, 200) // Truncate long descriptions
      }))
      .slice(0, 5); // Limit to top 5 results
  } catch (error) {
    console.error('TMDB search error:', error);
    return [];
  }
}

async function handleConfirmation(phoneNumber, message, userData) {
  try {
    const selectionNumber = parseInt(message.split(' ')[1]) - 1; // Convert to 0-based index
    const pendingSearch = userData.pendingSearch;

    if (!pendingSearch || !pendingSearch.searchResults) {
      return sendMessage(
        phoneNumber,
        'No pending search found. Please start a new request.'
      );
    }

    const selectedMedia = pendingSearch.searchResults[selectionNumber];

    if (!selectedMedia) {
      return sendMessage(
        phoneNumber,
        'Invalid selection. Please choose a number from the list.'
      );
    }

    // Create the media request
    await addDoc(collection(db, 'mediaRequests'), {
      managerId: userData.managerId,
      requesterPhone: phoneNumber,
      requesterNickname: userData.nickname || null,
      status: 'pending',
      ...selectedMedia,
      createdAt: new Date().toISOString()
    });

    // Clear the pending search
    const userRef = doc(db, 'users', phoneNumber);
    await updateDoc(userRef, {
      pendingSearch: null
    });

    return sendMessage(
      phoneNumber,
      `Your request for "${selectedMedia.title}" has been submitted! We'll notify you when it's been processed.`
    );

  } catch (error) {
    console.error('Error handling confirmation:', error);
    return sendMessage(
      phoneNumber,
      'Sorry, there was an error processing your selection. Please try again.'
    );
  }
}

function formatSearchResults(results) {
  const formattedResults = results
    .map((item, index) => {
      const year = item.releaseYear ? ` (${item.releaseYear})` : '';
      const type = item.mediaType === 'movie' ? 'Movie' : 'TV Show';
      return `${index + 1}. ${item.title}${year} - ${type}`;
    })
    .join('\n');

  return `Found these matches:\n\n${formattedResults}\n\nReply with "confirm X" to request (e.g., "confirm 1" for the first option)`;
}

async function sendMessage(to, body) {
  try {
    await twilioClient.messages.create({
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
      body
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}