'use client'

import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase/firebase'
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  Timestamp, 
  increment 
} from 'firebase/firestore'
import InviteUsers from '@/components/InviteUsers'
import ShowUsers from '@/components/ShowUsers'
import { 
  Users, 
  Film, 
  Star, 
  Calendar, 
  Info, 
  Check, 
  X, 
  Loader2, 
  Clock, 
  Tag, 
  Archive, 
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Trash2
} from 'lucide-react'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const LIBRARY_EXPIRY_DAYS = 21; // 3 weeks

const CollapsibleSection = ({ title, icon: Icon, badge, children, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-secondary/10 rounded-lg">
      <div className="px-4 py-3">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center cursor-pointer hover:opacity-80 transition-opacity text-xl font-semibold text-primary"
        >
          <Icon size={24} /> {}
          <span className="ml-4">{title}</span> {}
          {badge && (
            <span className="bg-primary/20 text-primary text-sm px-2 py-0.5 rounded-full ml-4">
              {badge}
            </span>
          )}
          <ChevronRight 
            size={20} 
            className={`transform transition-transform ml-4 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        </div>
      </div>
      
      <div 
        style={{
          height: isExpanded ? 'auto' : '0',
          visibility: isExpanded ? 'visible' : 'hidden',
          opacity: isExpanded ? 1 : 0,
          transition: 'all 0.3s ease-in-out'
        }}
      >
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

const MediaRequestCard = ({ request, details, isLoading, onAction }) => {
  // Handle custom requests (where mediaType === 'custom')
  if (request.mediaType === 'custom') {
    return (
      <div style={{ 
        backgroundColor: 'rgb(34, 34, 34)',
        border: '1px solid rgb(0, 160, 160)',
        borderRadius: '8px',
        padding: '24px',
        marginTop: '10px'
      }}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-medium text-primary mb-3">
              {request.title}
            </h3>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="badge badge-primary">
                Custom Request
              </span>
            </div>

            <div className="mt-auto flex flex-col gap-2 text-sm text-gray-400">
              <span>Requested by: {request.requesterNickname || 'User'}</span>
              <span>{new Date(request.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => onAction(request.id, 'approved')}
              className="action-button action-button-approve"
            >
              <Check size={14} />
              Approve
            </button>
            <button
              onClick={() => onAction(request.id, 'rejected')}
              className="action-button action-button-reject"
            >
              <X size={14} />
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={{ 
        backgroundColor: 'rgb(34, 34, 34)',
        border: '1px solid rgb(0, 160, 160)',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '192px',
      }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: 'rgb(34, 34, 34)',
      border: '1px solid rgb(0, 160, 160)',
      borderRadius: '8px',
      overflow: 'hidden',
      display: 'flex',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      marginTop: '10px'
    }}>
      {/* Poster on the left */}
      {details?.posterPath ? (
        <img
          src={`${TMDB_IMAGE_BASE_URL}${details.posterPath}`}
          alt={`${details.title} poster`}
          style={{
            width: '180px', 
            objectFit: 'cover',
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
            flexShrink: 0 
          }}
          onError={(e) => {
            e.target.src = '/placeholder-poster.jpg'
          }}
        />
      ) : (
        <div style={{
          width: '180px', 
          display: 'flex',
          flexShrink: 0, 
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-secondary)',
        }}>
          <Film size={32} className="text-gray-600" />
        </div>
      )}

      {/* Content next to poster */}
      <div style={{
        padding: '24px 24px 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minWidth: 0
      }}>
        <h3 className="text-xl font-medium text-primary mb-3">
          {details?.title || request.title}
        </h3>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className="badge badge-primary">
            {request.mediaType === 'movie' ? 'Movie' : 'TV Show'}
          </span>
          {details?.rating && (
            <span className="badge badge-rating">
              <Star size={12} className="mr-1" />
              {details.rating}/10
            </span>
          )}
          {details?.releaseYear && (
            <span className="badge badge-secondary">
              <Calendar size={12} className="mr-1" /> 
              {details.releaseYear}
            </span>
          )}
        </div>

        {details?.overview && (
          <p className="text-sm text-gray-300 line-clamp-2 mb-3">
            {details.overview}
          </p>
        )}

        {details?.genres?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {details.genres.slice(0, 3).map(genre => (
              <span key={genre} className="badge badge-secondary text-xs">
                {genre}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2 text-sm text-gray-400">
          <span>Requested by: {request.requesterNickname || 'User'}</span>
          <span>{new Date(request.createdAt).toLocaleDateString()}</span>
        </div>

        <div className="flex gap-6 mt-4">
          <button
            onClick={() => onAction(request.id, 'approved')}
            className="action-button action-button-approve flex-1"
          >
            <Check size={14} />
            Approve
          </button>
          <button
            onClick={() => onAction(request.id, 'rejected')}
            className="action-button action-button-reject flex-1"
          >
            <X size={14} />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};
const LibraryCard = ({ item, details, isLoading, onRemove }) => {
  const getExpiryText = () => {
    const daysUntilExpiry = Math.ceil((item.expiresAt.toDate() - new Date()) / (1000 * 60 * 60 * 24));
    const isExpiringSoon = daysUntilExpiry <= 3;
    
    if (daysUntilExpiry <= 0) return 'Expired';
    if (daysUntilExpiry >= 7) return `${Math.floor(daysUntilExpiry / 7)}w`;
    return `${daysUntilExpiry}d`;
  };

  const expiryText = getExpiryText();
  const isExpiringSoon = Math.ceil((item.expiresAt.toDate() - new Date()) / (1000 * 60 * 60 * 24)) <= 3;

  return (
    <div className="flex flex-col">
      {/* Cover with expiry badge */}
      <div style={{ 
        position: 'relative',
        width: '100%',
        aspectRatio: '2/3',
        borderRadius: '8px',
        overflow: 'hidden',
        marginBottom: '8px'
      }}>
        {details?.posterPath ? (
          <img
            src={`${TMDB_IMAGE_BASE_URL}${details.posterPath}`}
            alt={`${details.title} poster`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.src = '/placeholder-poster.jpg'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-secondary)'
          }}>
            <Film size={24} className="text-gray-600" />
          </div>
        )}
        
        {/* Expiry badge */}
        <div 
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            padding: '4px 8px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: isExpiringSoon ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            backdropFilter: 'blur(4px)'
          }}
        >
          <Clock size={12} />
          {expiryText}
        </div>
      </div>

{/* Title and trash icon container */}
<div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        minWidth: 0 // Allows text truncation to work
      }}>
        <div style={{
          flex: '1',
          minWidth: 0, // Allows text truncation to work
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: '14px',
          fontWeight: '500',
          color: 'rgb(209, 213, 219)' // text-gray-300 equivalent
        }}>
          {details?.title || item.title}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Are you sure you want to remove this item?')) {
              onRemove(item.id);
            }
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-red-500/20 transition-all duration-200 flex-shrink-0"
          style={{ marginLeft: '8px' }}
        >
          <Trash2 
            size={14} 
            className="text-red-400 transform hover:scale-110 transition-transform duration-200" 
          />
        </button>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [libraryItems, setLibraryItems] = useState([])
  const [confirmedUsers, setConfirmedUsers] = useState([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mediaDetails, setMediaDetails] = useState({})
  const [loadingDetails, setLoadingDetails] = useState({})
  const [requestsExpanded, setRequestsExpanded] = useState(true);
  const [libraryExpanded, setLibraryExpanded] = useState(true);

  useEffect(() => {
    if (!user?.uid) return

    const q = query(
      collection(db, 'mediaRequests'),
      where('managerId', '==', user.uid),
      where('status', '==', 'pending')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mediaRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      
      setRequests(mediaRequests)

      mediaRequests.forEach(request => {
        if (request.tmdbId) {
          fetchMediaDetails(request.tmdbId, request.mediaType)
        }
      })
    })

    return () => unsubscribe()
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return

    const q = query(
      collection(db, 'users'),
      where('managerId', '==', user.uid),
      where('status', '==', 'active')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setConfirmedUsers(users)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return

    const q = query(
      collection(db, 'library'),
      where('managerId', '==', user.uid),
      where('status', '==', 'active')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        docId: doc.id,
        expiresAt: doc.data().expiresAt
      }))
      
      setLibraryItems(items)

      items.forEach(item => {
        if (item.tmdbId && !mediaDetails[item.tmdbId]) {
          fetchMediaDetails(item.tmdbId, item.mediaType)
        }
      })
    })

    return () => unsubscribe()
  }, [user?.uid])

  const fetchMediaDetails = async (tmdbId, mediaType) => {
    if (mediaDetails[tmdbId] || loadingDetails[tmdbId]) return

    setLoadingDetails(prev => ({ ...prev, [tmdbId]: true }))

    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&append_to_response=credits,keywords`
      );

      if (!response.ok) throw new Error('Failed to fetch media details');

      const data = await response.json();
      
      const formattedData = {
        title: mediaType === 'movie' ? data.title : data.name,
        overview: data.overview,
        posterPath: data.poster_path,
        rating: data.vote_average?.toFixed(1),
        releaseYear: mediaType === 'movie' 
          ? data.release_date?.substring(0, 4)
          : data.first_air_date?.substring(0, 4),
        genres: data.genres?.map(g => g.name) || [],
        status: data.status,
        numberOfSeasons: data.number_of_seasons,
        numberOfEpisodes: data.number_of_episodes,
      };

      setMediaDetails(prev => ({ ...prev, [tmdbId]: formattedData }))
    } catch (error) {
      console.error('Error fetching media details:', error)
    } finally {
      setLoadingDetails(prev => ({ ...prev, [tmdbId]: false }))
    }
  }

  const handleRequestAction = async (requestId, action) => {
    try {
      const requestRef = doc(db, 'mediaRequests', requestId)
      const request = requests.find(r => r.id === requestId)
  
      if (action === 'approved') {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 21);
  
        await addDoc(collection(db, 'library'), {
          ...request,
          requestId: requestId,
          status: 'active',
          addedAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(expiryDate)
        })
      }
  
      await updateDoc(requestRef, {
        status: action,
        updatedAt: Timestamp.now()
      })
  
      await fetch('/api/notify-request-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId,
          action
        })
      })
    } catch (error) {
      console.error('Error updating request:', error)
    }
  }

  const handleRemoveLibraryItem = async (itemId) => {
    try {
      const libraryItem = libraryItems.find(item => item.id === itemId);
      if (!libraryItem || !libraryItem.docId) {
        throw new Error('Library item not found');
      }
  
      const libraryRef = doc(db, 'library', libraryItem.docId);
      await updateDoc(libraryRef, {
        status: 'removed',
        removedAt: Timestamp.now()
      });
  
      console.log('Successfully removed item:', itemId);
    } catch (error) {
      console.error('Error removing library item:', error);
      alert(`Failed to remove item: ${error.message}`);
    }
  };

  return (
    
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-4">
          Your Dashboard
        </h1>
        <div className="flex">
          <button 
            onClick={() => setShowInviteModal(true)}
            className="nav-button nav-button-highlight inline-flex items-center gap-2"
          >
            <Users size={20} />
            Invite Users
          </button>
          <button 
            onClick={() => setShowUsersModal(true)}
            className="nav-button inline-flex items-center gap-2"
            style={{ marginLeft: '20px', marginBottom: '16px' }} 
          >
            <Users size={20} />
            View Users ({confirmedUsers.length})
          </button>
        </div>
      </div>

{/* Main Content */}
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  {/* Requests Section Header */}
<div 
  onClick={() => setRequestsExpanded(!requestsExpanded)}
  style={{
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(0, 160, 160, 0.3)',
    marginBottom: '24px',
    cursor: 'pointer',
  }}
>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px', // Increased spacing between elements
      color: 'rgb(0, 160, 160)' // Using the primary color
    }}>
      <Film size={24} style={{ flexShrink: 0 }} />
      <span style={{
        fontSize: '24px',
        fontWeight: 'bold',
        marginRight: '16px',
        color: 'rgb(0, 160, 160)'
      }}>
        Media Requests
      </span>
      {requests.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(0, 160, 160, 0.2)',
          color: 'rgb(0, 160, 160)',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '16px',
          fontWeight: '500'
        }}>
          {requests.length}
        </div>
      )}
    </div>
    <ChevronRight 
      size={24} 
      style={{
        transform: requestsExpanded ? 'rotate(90deg)' : 'none',
        transition: 'transform 0.2s ease',
        color: 'rgb(0, 160, 160)',
        flexShrink: 0
      }}
    />
  </div>
    
    <div style={{
      height: requestsExpanded ? 'auto' : '0',
      opacity: requestsExpanded ? 1 : 0,
      overflow: 'hidden',
      transition: 'all 0.3s ease-in-out',
      marginTop: '16px'
    }}>
      {requests.length === 0 ? (
        <div className="text-center p-4 bg-secondary/20 rounded-lg text-gray-400">
          No pending media requests
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <MediaRequestCard
              key={request.id}
              request={request}
              details={mediaDetails[request.tmdbId]}
              isLoading={loadingDetails[request.tmdbId]}
              onAction={handleRequestAction}
            />
          ))}
        </div>
      )}
    </div>
  </div>

  {/* Library Section Header */}
<div 
  onClick={() => setLibraryExpanded(!libraryExpanded)}
  style={{
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(0, 160, 160, 0.3)',
    marginBottom: '24px',
    cursor: 'pointer'
  }}
>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px', // Increased spacing between elements
      color: 'rgb(0, 160, 160)' // Using the primary color
    }}>
      <Archive size={24} style={{ flexShrink: 0 }} />
      <span style={{
        fontSize: '24px',
        fontWeight: 'bold',
        marginRight: '16px',
        color: 'rgb(0, 160, 160)'
      }}>
        Media Library
      </span>
      {libraryItems.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(0, 160, 160, 0.2)',
          color: 'rgb(0, 160, 160)',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '16px',
          fontWeight: '500'
        }}>
          {libraryItems.length}
        </div>
      )}
    </div>
    <ChevronRight 
      size={24} 
      style={{
        transform: libraryExpanded ? 'rotate(90deg)' : 'none',
        transition: 'transform 0.2s ease',
        color: 'rgb(0, 160, 160)',
        flexShrink: 0
      }}
    />
  </div>

    <div style={{
      height: libraryExpanded ? 'auto' : '0',
      opacity: libraryExpanded ? 1 : 0,
      overflow: 'hidden',
      transition: 'all 0.3s ease-in-out',
      marginTop: '16px'

    }}>
      {libraryItems.length === 0 ? (
        <div className="text-center p-4 bg-secondary/20 rounded-lg text-gray-400">
          No media in library
        </div>
      ) : (
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '24px',
          width: '100%'
        }}>
          {libraryItems
            .sort((a, b) => a.expiresAt.toDate() - b.expiresAt.toDate())
            .map((item) => (
              <div key={item.id} style={{ minWidth: 0 }}>
              <LibraryCard
                key={item.id}
                item={item}
                details={mediaDetails[item.tmdbId]}
                isLoading={loadingDetails[item.tmdbId]}
                onRemove={handleRemoveLibraryItem}
              />
            </div>
            ))}
        </div>
      )}
    </div>
  </div>
        </div>

        {showInviteModal && (
        <InviteUsers onClose={() => setShowInviteModal(false)} />
      )}
      {showUsersModal && (
      <ShowUsers 
        users={confirmedUsers}
        onClose={() => setShowUsersModal(false)}
      />
    )}
      </div>
    </div>
  );
}