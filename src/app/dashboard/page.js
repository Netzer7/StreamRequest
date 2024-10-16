'use client'

import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [requests, setRequests] = useState([]) // This would be populated from your backend

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Failed to log out', error)
    }
  }

  return (
    <div className="dashboard">
      <h1>Your Dashboard</h1>
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
