'use client'

import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase/firebase'
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore'
import InviteUsers from '@/components/InviteUsers'
import { Users, Phone, Edit2, Check, X, Film } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [confirmedUsers, setConfirmedUsers] = useState([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState(null)
  const [nickname, setNickname] = useState('')

  // Fetch confirmed users
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

  // Fetch media requests
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
        createdAt: doc.data().createdAt
      }))
      
      // Sort by creation date, newest first
      mediaRequests.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      
      setRequests(mediaRequests)
    })

    return () => unsubscribe()
  }, [user?.uid])

  const handleRequestAction = async (requestId, action) => {
    try {
      const requestRef = doc(db, 'mediaRequests', requestId)
      await updateDoc(requestRef, {
        status: action,
        updatedAt: new Date().toISOString()
      })

      // Send SMS notification to user about the status update
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

  // Render media requests section
  const renderMediaRequests = () => (
    <div className="media-requests">
      <h2 className="flex items-center gap-2 text-2xl font-semibold text-primary mb-6">
        <Film size={24} className="inline" />
        Media Requests
        {requests.length > 0 && (
          <span className="bg-primary text-white text-sm px-2 py-1 rounded-full ml-2">
            {requests.length}
          </span>
        )}
      </h2>
      
      {requests.length === 0 ? (
        <div className="text-center p-4 bg-secondary/20 rounded-lg">
          No pending media requests
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div 
              key={request.id}
              className="bg-secondary/20 rounded-lg p-4"
            >
              <h3 className="font-medium text-lg text-primary mb-1">
                {request.title}
              </h3>
              <div className="text-sm text-gray-400 mb-3">
                Requested by: {request.requesterNickname || 'User'} • 
                {new Date(request.createdAt).toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRequestAction(request.id, 'approved')}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleRequestAction(request.id, 'rejected')}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ... rest of your component (confirmed users section, etc.)

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
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary rounded hover:bg-primary hover:text-white transition-colors"
          >
            <Users size={20} />
            Invite Users
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Confirmed Users Section */}
          <div className="lg:col-span-2">
            {/* ... your existing confirmed users section ... */}
          </div>

          {/* Media Requests Section */}
          <div className="lg:col-span-1">
            {renderMediaRequests()}
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
  )
}