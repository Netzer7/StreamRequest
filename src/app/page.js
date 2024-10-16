'use client'

import { useAuth } from '@/app/context/AuthContext'
import Link from 'next/link'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="hero">
      <h1>Meet your Media Concierge</h1>
      <p>Need something to watch? We're on it. StreamRequest combines your media library with easy request management.</p>
      {user ? (
        <Link href="/dashboard" className="button">Go to Dashboard</Link>
      ) : (
        <Link href="/signup" className="button">Get Started</Link>
      )}
    </div>
  )
}