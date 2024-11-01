'use client'

import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase/firebase'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import InviteUsers from '@/components/InviteUsers'
import { Users, Phone, Edit2, Check, X, Film, LogOut, UserPlus } from 'lucide-react'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState([])
  const [confirmedUsers, setConfirmedUsers] = useState([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState(null)
  const [nickname, setNickname] = useState('')

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
    }, (error) => {
      console.error('Error fetching users:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user?.uid])

  const handleEditStart = (confirmedUser) => {
    setEditingUser(confirmedUser.id)
    setNickname(confirmedUser.nickname || '')
  }

  const handleEditCancel = () => {
    setEditingUser(null)
    setNickname('')
  }

  const handleEditSave = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        nickname: nickname.trim()
      })
      setEditingUser(null)
      setNickname('')
    } catch (error) {
      console.error('Error updating nickname:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Failed to log out', error)
    }
  }

  const formatPhoneNumber = (phoneNumber) => {
    // Remove any non-digit characters and the +1 prefix
    const cleaned = phoneNumber.replace(/\D/g, '').slice(-10)
    // Format as (XXX) XXX-XXXX
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">
            Your Dashboard
          </h1>
          <button 
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary rounded hover:bg-primary hover:text-white transition-colors"
          >
            <UserPlus size={20} />
            <span>Invite Users</span>
          </button>
        </div>

        {/* Confirmed Users Section */}
        <div className="mb-8">
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-primary mb-6">
            <Users size={24} className="inline" />
            Confirmed Users
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : confirmedUsers.length > 0 ? (
            <div className="space-y-4">
              {confirmedUsers.map((confirmedUser) => (
                <div 
                  key={confirmedUser.id} 
                  className="bg-secondary/20 rounded-lg p-4"
                >
                  <div className="flex items-start">
                    <Phone size={20} className="text-primary mt-1 mr-3" />
                    <div className="flex-grow">
                      {editingUser === confirmedUser.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Enter nickname"
                            className="w-full px-3 py-2 rounded bg-background border border-secondary"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditSave(confirmedUser.id)}
                              className="flex items-center gap-1 px-3 py-1 bg-primary text-white rounded"
                            >
                              <Check size={14} />
                              Save
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="flex items-center gap-1 px-3 py-1 bg-secondary rounded"
                            >
                              <X size={14} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {confirmedUser.nickname && (
                            <div className="font-medium text-lg">
                              {confirmedUser.nickname}
                            </div>
                          )}
                          <div className="text-gray-300">
                            {formatPhoneNumber(confirmedUser.phoneNumber)}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            Joined {new Date(confirmedUser.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                    {editingUser !== confirmedUser.id && (
                      <button
                        onClick={() => handleEditStart(confirmedUser)}
                        className="p-1 hover:bg-secondary/40 rounded"
                      >
                        <Edit2 size={16} className="text-primary" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 bg-secondary/20 rounded-lg">
              <p className="text-gray-400">No confirmed users yet. Invite some users to get started!</p>
            </div>
          )}
        </div>

        {/* Media Requests Section */}
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-primary mb-6">
            <Film size={24} className="inline" />
            Media Requests
          </h2>
          
          {requests.length === 0 ? (
            <div className="text-center p-4">
              No pending media requests
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div 
                  key={request.id}
                  className="bg-secondary/20 rounded-lg p-4"
                >
                  {/* Request content */}
                </div>
              ))}
            </div>
          )}
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
  )
}