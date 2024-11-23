import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { db } from '@/lib/firebase/firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Constants for string lengths
const MAX_TITLE_LENGTH = 30;
const MAX_OVERVIEW_LENGTH = 150;

// Helper function to truncate strings with ellipsis
function truncateString(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

// Helper function to check if message is a valid selection
function isValidSelection(message) {
  // Clean the message and check if it's either a number or starts with "confirm"
  const cleanMessage = message.trim().toLowerCase();
  
  // Check if it's just a number
  if (/^[1-5]$/.test(cleanMessage)) {
    return parseInt(cleanMessage) - 1;
  }
  
  // Check if it starts with "confirm" followed by a number
  if (cleanMessage.startsWith('confirm')) {
    const num = cleanMessage.split(/\s+/)[1];
    if (/^[1-5]$/.test(num)) {
      return parseInt(num) - 1;
    }
  }
  
  return null;
}

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

    // Check if the message is a selection
    const selectionIndex = isValidSelection(messageBody);
    if (selectionIndex !== null) {
      return handleConfirmation(phoneNumber, selectionIndex, userDoc.data());
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
        overview: truncateString(item.overview, MAX_OVERVIEW_LENGTH)
      }))
      .slice(0, 5); // Limit to top 5 results
  } catch (error) {
    console.error('TMDB search error:', error);
    return [];
  }
}

function formatSearchResults(results) {
  const formattedResults = results
    .map((item, index) => {
      const title = truncateString(item.title, MAX_TITLE_LENGTH);
      const year = item.releaseYear ? ` (${item.releaseYear})` : '';
      const type = item.mediaType === 'movie' ? 'Movie' : 'TV Show';
      return `${index + 1}. ${title}${year} - ${type}`;
    })
    .join('\n');

  return `Found these matches:\n\n${formattedResults}\n\nEnter a number (1-${results.length}) to select`;
}


async function handleConfirmation(phoneNumber, selectionIndex, userData) {
  try {
    const pendingSearch = userData.pendingSearch;

    if (!pendingSearch || !pendingSearch.searchResults) {
      return sendMessage(
        phoneNumber,
        'No pending search found. Please search for something first.'
      );
    }

    const selectedMedia = pendingSearch.searchResults[selectionIndex];

    if (!selectedMedia) {
      return sendMessage(
        phoneNumber,
        `Invalid number. Please enter a number between 1 and ${pendingSearch.searchResults.length}.`
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
      `Your request for "${truncateString(selectedMedia.title, MAX_TITLE_LENGTH)}" has been submitted! We'll notify you when it's been processed.`
    );

  } catch (error) {
    console.error('Error handling confirmation:', error);
    return sendMessage(
      phoneNumber,
      'Sorry, there was an error processing your selection. Please try again.'
    );
  }
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