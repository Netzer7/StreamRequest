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
  ChevronRight
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
  if (isLoading) {
    return (
      <div className="bg-secondary/20 rounded-lg p-6 flex justify-center items-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="bg-secondary/20 rounded-lg p-4">
        <h3 className="text-lg font-medium text-primary">{request.title}</h3>
        <p className="text-sm text-gray-400">Error loading media details</p>
      </div>
    );
  }

  return (
    <div className="media-request-card rounded-lg overflow-hidden shadow-lg">
      <div className="flex gap-3 p-3"> 
        <div className="media-poster flex-shrink-0 w-16">
          {details.posterPath ? (
            <img
              src={`${TMDB_IMAGE_BASE_URL}${details.posterPath}`}
              alt={`${details.title} poster`}
              className="w-16 h-24 object-cover rounded-md"
              onError={(e) => {
                e.target.src = '/placeholder-poster.jpg'
              }}
            />
          ) : (
            <div className="w-16 h-24 bg-secondary rounded-md flex items-center justify-center">
              <Film size={16} className="text-gray-600" />
            </div>
          )}
        </div>

        <div className="flex-grow min-w-0">
          <h3 className="text-lg font-medium text-primary mb-2 line-clamp-1">
            {details.title}
          </h3>

          <div className="flex flex-wrap gap-2 mb-3">
            <span className="badge badge-primary">
              {request.mediaType === 'movie' ? 'Movie' : 'TV Show'}
            </span>
            {details.rating && (
              <span className="badge badge-rating">
                <Star size={12} className="mr-1" />
                {details.rating}/10
              </span>
            )}
            {details.releaseYear && (
              <span className="badge badge-secondary">
                <Calendar size={12} className="mr-1" /> 
                {details.releaseYear}
              </span>
            )}
          </div>

          {details.overview && (
            <p className="text-sm text-gray-300 line-clamp-2 mb-3">
              {details.overview}
            </p>
          )}

          {details.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {details.genres.slice(0, 3).map(genre => (
                <span key={genre} className="badge badge-secondary text-xs">
                  {genre}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
            <span>Requested by: {request.requesterNickname || 'User'}</span>
            <span>{new Date(request.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="flex gap-2">
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
    </div>
  );
};

const LibraryCard = ({ item, details, isLoading, onRenew }) => {
  const daysUntilExpiry = Math.ceil((item.expiresAt.toDate() - new Date()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysUntilExpiry <= 3;

  return (
    <div className="library-card rounded-lg overflow-hidden shadow-lg bg-secondary/20">
      <div className="flex gap-3 p-3">
        <div className="media-poster flex-shrink-0 w-16">
          {details?.posterPath ? (
            <img
              src={`${TMDB_IMAGE_BASE_URL}${details.posterPath}`}
              alt={`${details.title} poster`}
              className="w-16 h-24 object-cover rounded-md"
              onError={(e) => {
                e.target.src = '/placeholder-poster.jpg'
              }}
            />
          ) : (
            <div className="w-16 h-24 bg-secondary rounded-md flex items-center justify-center">
              <Film size={16} className="text-gray-600" />
            </div>
          )}
        </div>

        <div className="flex-grow min-w-0">
          <h3 className="text-lg font-medium text-primary mb-2 line-clamp-1">
            {details?.title || item.title}
          </h3>

          <div className={`flex items-center gap-2 mb-3 ${isExpiringSoon ? 'text-red-400' : 'text-gray-400'}`}>
            <Clock size={14} />
            <span className="text-sm">
              {daysUntilExpiry > 0 
                ? `Expires in ${daysUntilExpiry} days`
                : 'Expired'}
            </span>
          </div>

          <button
            onClick={() => onRenew(item.id)}
            className="action-button action-button-renew w-full"
          >
            <RefreshCw size={14} />
            Renew for 3 Weeks
          </button>
        </div>
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
  const [loading, setLoading] = useState(true)
  const [mediaDetails, setMediaDetails] = useState({})
  const [loadingDetails, setLoadingDetails] = useState({})

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
      where('managerId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
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
          expiresAt: Timestamp.fromDate(expiryDate),
          renewals: 0
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

  const handleRenewLibraryItem = async (itemId) => {
    try {
      const itemRef = doc(db, 'library', itemId)
      const newExpiryDate = new Date(Date.now() + LIBRARY_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

      await updateDoc(itemRef, {
        expiresAt: Timestamp.fromDate(newExpiryDate),
        renewals: increment(1)
      })

      await fetch('/api/notify-library-renewal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemId,
          newExpiryDate
        })
      })
    } catch (error) {
      console.error('Error renewing library item:', error)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Your Dashboard
          </h1>
          <button 
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
          >
            <Users size={20} />
            Invite Users
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Media Requests Section */}
          <div className="lg:col-span-1">
            <CollapsibleSection
              title="Media Requests"
              icon={Film}
              badge={requests.length || null}
              defaultExpanded={true}
            >
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
            </CollapsibleSection>
          </div>

          {/* Library Section */}
          <div className="lg:col-span-2">
            <CollapsibleSection
              title="Media Library"
              icon={Archive}
              badge={libraryItems.length || null}
              defaultExpanded={false}
            >
              {libraryItems.length === 0 ? (
                <div className="text-center p-4 bg-secondary/20 rounded-lg text-gray-400">
                  No media in library
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {libraryItems
                    .sort((a, b) => a.expiresAt.toDate() - b.expiresAt.toDate())
                    .map((item) => (
                      <LibraryCard
                        key={item.id}
                        item={item}
                        details={mediaDetails[item.tmdbId]}
                        isLoading={loadingDetails[item.tmdbId]}
                        onRenew={handleRenewLibraryItem}
                      />
                    ))}
                </div>
              )}
            </CollapsibleSection>
          </div>
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative bg-background rounded-lg max-w-md w-full">
              <button 
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
                onClick={() => setShowInviteModal(false)}
              >
                <X size={20} />
              </button>
              <InviteUsers onSuccess={() => setShowInviteModal(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}