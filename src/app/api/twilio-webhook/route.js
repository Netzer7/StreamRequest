import { NextResponse } from "next/server";
import { adminDb } from "@/firebase-admin";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData);

    console.log("SMS details:", {
      from: body.From,
      body: body.Body,
      timestamp: new Date().toISOString(),
    });

    const messageBody = body.Body.toLowerCase().trim();

    // Handle user registration confirmation
    if (messageBody === "yes") {
      return handleRegistration(body.From);
    }

    if (messageBody === "help" || messageBody === "start") {
      return;
    }

    // Handle deregistration
    if (messageBody === "deregister") {
      return handleDeregistration(body.From);
    }

    // Handle RENEW command
    if (messageBody.startsWith('renew ')) {
      return handleRenewalCommand(body.From, messageBody);
    }

    // Handle DELETE command
    if (messageBody.startsWith('delete ')) {
      return handleDeleteCommand(body.From, messageBody);
    }

    // Check if the message is a number (1-5)
    if (/^[1-5]$/.test(messageBody)) {
      return handleConfirmation(body.From, messageBody);
    }

    // Handle new media request/search
    return handleMediaSearch(body.From, body.Body);
  } catch (error) {
    console.error("Webhook error:", error);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>An error occurred. Please try again later.</Message></Response>',
      {
        status: 500,
        headers: {
          "Content-Type": "text/xml",
        },
      }
    );
  }
}

async function handleRegistration(phoneNumber) {
  try {
    const pendingUsersRef = adminDb.collection("pendingUsers");
    const query = await pendingUsersRef
      .where("phoneNumber", "==", phoneNumber)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (query.empty) {
      console.log("No pending invitation found for:", phoneNumber);
      return createTwiMLResponse(
        "No pending invitation found. Please contact your media server administrator."
      );
    }

    const pendingUser = query.docs[0];
    const pendingData = pendingUser.data();

    console.log("Found pending user data:", pendingData);

    // Create new user document with null check for nickname
    const newUserData = {
      phoneNumber,
      managerId: pendingData.managerId,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    // Only add nickname if it exists in pendingData
    if (pendingData.nickname) {
      newUserData.nickname = pendingData.nickname;
    }

    console.log("Creating new user with data:", newUserData);

    await adminDb.collection("users").add(newUserData);

    await pendingUser.ref.update({
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
    });

    console.log("User registration confirmed for:", phoneNumber);
    return createTwiMLResponse(
      "Registration confirmed! You can now send media requests to this number."
    );
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

async function handleDeregistration(phoneNumber) {
  // Find the active user
  const usersRef = adminDb.collection("users");
  const userQuery = await usersRef
    .where("phoneNumber", "==", phoneNumber)
    .where("status", "==", "active")
    .get();

  if (userQuery.empty) {
    console.log("No active user found for deregistration:", phoneNumber);
    return;
  }

  const batch = adminDb.batch();
  const userDoc = userQuery.docs[0];
  const userData = userDoc.data();

  // Update user status
  batch.update(userDoc.ref, {
    status: "deregistered",
    deregisteredAt: new Date().toISOString(),
  });

  // Cancel pending requests
  const requestsRef = adminDb.collection("mediaRequests");
  const pendingRequestsQuery = await requestsRef
    .where("requesterPhone", "==", phoneNumber)
    .where("status", "==", "pending")
    .get();

  pendingRequestsQuery.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancellationReason: "user_deregistered",
    });
  });

  // Remove from any pending invitations
  const pendingUsersRef = adminDb.collection("pendingUsers");
  const pendingQuery = await pendingUsersRef
    .where("phoneNumber", "==", phoneNumber)
    .where("status", "==", "pending")
    .get();

  pendingQuery.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancellationReason: "user_deregistered",
    });
  });

  // Notify admin
  const adminId = userData.managerId;
  if (adminId) {
    const notificationsRef = adminDb.collection("notifications");
    batch.create(notificationsRef.doc(), {
      type: "user_deregistered",
      userId: userDoc.id,
      managerId: adminId,
      userPhone: phoneNumber,
      userName: userData.nickname || "User",
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  // Execute all updates
  try {
    await batch.commit();
    console.log("Successfully deregistered user:", phoneNumber);
  } catch (error) {
    console.error("Error in batch deregistration:", error);
    throw error;
  }
}

async function handleRenewalCommand(phoneNumber, messageBody) {
  try {
    const itemNumber = parseInt(messageBody.split(' ')[1]);
    
    if (isNaN(itemNumber)) {
      return createTwiMLResponse(
        "Please specify a valid item number (e.g., RENEW 1)"
      );
    }

    const notificationsRef = adminDb.collection("expiryNotifications");
    const notificationQuery = await notificationsRef
      .where("requesterPhone", "==", phoneNumber)
      .where("status", "==", "pending")
      .orderBy("sentAt", "desc")
      .limit(1)
      .get();

    if (notificationQuery.empty) {
      return createTwiMLResponse(
        "No recent expiring items found. Please wait for an expiry notification before attempting to renew."
      );
    }

    const notification = notificationQuery.docs[0];
    const notificationData = notification.data();

    if (!notificationData.itemOrder || itemNumber < 1 || itemNumber > notificationData.itemOrder.length) {
      return createTwiMLResponse(
        `Please enter a valid item number between 1 and ${notificationData.itemOrder?.length || 'N/A'}`
      );
    }

    const selectedItem = notificationData.itemOrder[itemNumber - 1];
    
    // Calculate new expiry date (3 weeks from now)
    const newExpiryDate = new Date(Date.now() + (21 * 24 * 60 * 60 * 1000));

    // Update the library item using server timestamp
    const libraryRef = adminDb.collection("library");
    await libraryRef.doc(selectedItem.id).update({
      expiresAt: newExpiryDate.toISOString(),
      renewedAt: new Date().toISOString(),
      renewalCount: adminDb.FieldValue.increment(1)
    });

    // Update the notification status for this item
    const updatedItemOrder = [...notificationData.itemOrder];
    updatedItemOrder[itemNumber - 1] = {
      ...selectedItem,
      status: 'renewed'
    };

    await notification.ref.update({
      itemOrder: updatedItemOrder,
      [`renewals.${selectedItem.id}`]: {
        renewedAt: new Date().toISOString(),
        newExpiryDate: newExpiryDate.toISOString()
      }
    });

    return createTwiMLResponse(
      `Successfully renewed "${selectedItem.title}". New expiry date: ${newExpiryDate.toLocaleDateString()}`
    );
  } catch (error) {
    console.error("Renewal command error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    return createTwiMLResponse(
      "An error occurred while processing your renewal request. Please try again later."
    );
  }
}

async function handleDeleteCommand(phoneNumber, messageBody) {
  try {
    // Extract the item number from the command (e.g., "delete 2" -> "2")
    const itemNumber = parseInt(messageBody.split(' ')[1]);
    
    if (isNaN(itemNumber)) {
      return createTwiMLResponse(
        "Please specify a valid item number (e.g., DELETE 1)"
      );
    }

    // Get the most recent expiry notification for this user
    const notificationsRef = adminDb.collection("expiryNotifications");
    const notificationQuery = await notificationsRef
      .where("requesterPhone", "==", phoneNumber)
      .where("status", "==", "pending")
      .orderBy("sentAt", "desc")
      .limit(1)
      .get();

    if (notificationQuery.empty) {
      return createTwiMLResponse(
        "No recent expiring items found. Please wait for an expiry notification before attempting to delete."
      );
    }

    const notification = notificationQuery.docs[0];
    const notificationData = notification.data();
    
    // Verify the item number is valid
    if (!notificationData.itemOrder || itemNumber < 1 || itemNumber > notificationData.itemOrder.length) {
      return createTwiMLResponse(
        `Please enter a valid item number between 1 and ${notificationData.itemOrder.length}`
      );
    }

    // Get the selected item
    const selectedItem = notificationData.itemOrder[itemNumber - 1];
    
    // Update the library item status to deleted
    const libraryRef = adminDb.collection("library");
    await libraryRef.doc(selectedItem.id).update({
      status: 'deleted',
      deletedAt: adminDb.Timestamp.now(),
      deletedBy: 'user',
      deletionReason: 'user_requested'
    });

    // Update the notification status for this item
    const updatedItemOrder = [...notificationData.itemOrder];
    updatedItemOrder[itemNumber - 1] = {
      ...selectedItem,
      status: 'deleted'
    };

    await notification.ref.update({
      itemOrder: updatedItemOrder,
      [`deletions.${selectedItem.id}`]: {
        deletedAt: new Date().toISOString()
      }
    });

    return createTwiMLResponse(
      `"${selectedItem.title}" has been removed from your library.`
    );
  } catch (error) {
    console.error("Delete command error:", error);
    return createTwiMLResponse(
      "An error occurred while processing your delete request. Please try again later."
    );
  }
}

async function handleMediaSearch(phoneNumber, searchQuery) {
  // First check if user is registered
  const usersRef = adminDb.collection("users");
  const userQuery = await usersRef
    .where("phoneNumber", "==", phoneNumber)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (userQuery.empty) {
    return createTwiMLResponse(
      "You are not registered to make media requests. Please contact your media server administrator."
    );
  }

  // Search TMDB
  const searchResults = await searchTMDB(searchQuery);

  if (searchResults.length === 0) {
    // Store the original query for later use
    const user = userQuery.docs[0];
    await user.ref.update({
      pendingSearch: {
        customRequest: searchQuery,
        timestamp: new Date().toISOString(),
        originalQuery: searchQuery,
      },
    });

    return createTwiMLResponse(
      "No matches found. Would you like to:\n\n" +
        "1. Submit this as a custom request\n" +
        "2. Try searching with different terms\n\n" +
        "Reply with 1 or 2"
    );
  }

  // Store search results in user document
  const user = userQuery.docs[0];
  await user.ref.update({
    pendingSearch: {
      searchResults,
      timestamp: new Date().toISOString(),
      originalQuery: searchQuery,
    },
  });

  // Format and send results
  const formattedResults = formatSearchResults(searchResults);
  return createTwiMLResponse(formattedResults);
}

async function handleConfirmation(phoneNumber, message) {
  const usersRef = adminDb.collection("users");
  const userQuery = await usersRef
    .where("phoneNumber", "==", phoneNumber)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (userQuery.empty) {
    return createTwiMLResponse(
      "You are not registered to make media requests."
    );
  }

  const user = userQuery.docs[0];
  const userData = user.data();

  if (!userData.pendingSearch) {
    return createTwiMLResponse(
      "No pending search found. Please start a new request."
    );
  }

  // Handle custom request confirmation
  if (userData.pendingSearch.customRequest) {
    if (message === "1") {
      // Submit as custom request
      await adminDb.collection("mediaRequests").add({
        title: userData.pendingSearch.customRequest,
        mediaType: "custom",
        overview: "Custom media request",
        requesterId: user.id,
        requesterPhone: phoneNumber,
        requesterNickname: userData.nickname || null,
        managerId: userData.managerId,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      // Clear the pending search
      await user.ref.update({
        pendingSearch: null,
      });

      return createTwiMLResponse(
        `Your custom request for "${userData.pendingSearch.customRequest}" has been submitted and will be reviewed by your media server administrator.`
      );
    } else if (message === "2") {
      // Clear the pending search for a new attempt
      await user.ref.update({
        pendingSearch: null,
      });
      return createTwiMLResponse(
        "Please try your search again with different terms."
      );
    } else {
      return createTwiMLResponse(
        "Please reply with 1 to submit as custom request, or 2 to try again."
      );
    }
  }

  // Handle regular media selection
  const selectionNumber = parseInt(message) - 1;
  const selectedMedia = userData.pendingSearch.searchResults[selectionNumber];

  if (!selectedMedia) {
    return createTwiMLResponse(
      `Invalid selection. Please enter a number between 1 and ${userData.pendingSearch.searchResults.length}.`
    );
  }

  // Create the media request
  await adminDb.collection("mediaRequests").add({
    ...selectedMedia,
    requesterId: user.id,
    requesterPhone: phoneNumber,
    requesterNickname: userData.nickname || null,
    managerId: userData.managerId,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  // Clear the pending search
  await user.ref.update({
    pendingSearch: null,
  });

  return createTwiMLResponse(
    `Your request for "${selectedMedia.title}" has been submitted and will be reviewed by your media server administrator.`
  );
}

async function searchTMDB(query) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error("TMDB API request failed");
    }

    const data = await response.json();

    return data.results
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .map((item) => {
        // Create base object with required fields
        const mediaItem = {
          tmdbId: item.id,
          title: item.media_type === "movie" ? item.title : item.name,
          mediaType: item.media_type,
          overview: item.overview
            ? item.overview.substring(0, 150)
            : "No description available.",
        };

        // Add optional fields only if they exist
        if (item.media_type === "movie" && item.release_date) {
          mediaItem.releaseYear = item.release_date.substring(0, 4);
        } else if (item.media_type === "tv" && item.first_air_date) {
          mediaItem.releaseYear = item.first_air_date.substring(0, 4);
        }

        if (item.vote_average) {
          mediaItem.rating = item.vote_average.toFixed(1);
        }

        if (item.poster_path) {
          mediaItem.posterPath = item.poster_path;
        }

        return mediaItem;
      })
      .slice(0, 5);
  } catch (error) {
    console.error("TMDB search error:", error);
    return [];
  }
}

function formatSearchResults(results) {
  const formattedResults = results
    .map((item, index) => {
      const year = item.releaseYear ? ` (${item.releaseYear})` : "";
      const type = item.mediaType === "movie" ? "Movie" : "TV Show";
      const rating = item.rating ? ` • Rating: ${item.rating}/10` : "";

      return `${index + 1}. ${item.title}${year} - ${type}${rating}\n${item.overview}\n`;
    })
    .join("\n");

  return `Best matches found:\n\n${formattedResults}\nEnter a number (1-${results.length}) to select`;
}

function createTwiMLResponse(message) {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    }
  );
}
