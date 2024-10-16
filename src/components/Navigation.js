// src/components/Navigation.js
'use client'

import Link from 'next/link'
import { useAuth } from '@/app/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function Navigation() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/')
    } catch (error) {
      console.error('Failed to log out', error)
    }
  }

  return (
    <nav>
      <div className="logo">StreamRequest</div>
      <ul>
        <li><Link href="/">Home</Link></li>
        {user ? (
          <>
            <li><Link href="/dashboard">Dashboard</Link></li>
            <li><button onClick={handleLogout} className="nav-button">Log Out</button></li>
          </>
        ) : (
          <>
            <li><Link href="/login">Login</Link></li>
            <li><Link href="/signup">Sign Up</Link></li>
          </>
        )}
      </ul>
    </nav>
  )
}