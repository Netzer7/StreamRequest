'use client'

import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import InviteUsers from '@/components/InviteUsers'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState([])
  const [showInviteModal, setShowInviteModal] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Failed to log out', error)
    }
  }

  return (
    <div className="dashboard container">
      <div className="flex justify-between items-center mb-6">
        <h1>Your Dashboard</h1>
        <button 
          className="button"
          onClick={() => setShowInviteModal(true)}
        >
          Invite Users
        </button>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="relative">
            <button 
              className="absolute top-2 right-2 text-white"
              onClick={() => setShowInviteModal(false)}
            >
              ×
            </button>
            <InviteUsers />
          </div>
        </div>
      )}

      <div className="content-grid">
        {requests.map((request) => (
          <div key={request.id} className="content-item">
            <div className="content-item-info">
              <h3>{request.title}</h3>
              <p>Requested by: {request.requester}</p>
              <button>Approve</button>
              <button>Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}