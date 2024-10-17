'use client'

import { useAuth } from '@/app/context/AuthContext'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Home() {
  const { user } = useAuth()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [])

  return (
    <>
      <section className="hero">
        <div className={`hero-content ${isVisible ? 'fade-in' : ''}`}>
          <h1 className="hero-title">Meet your Media Concierge</h1>
          <p className="hero-subtitle">Need something to watch? We're on it. StreamRequest combines your media library with easy request management.</p>
          {user ? (
            <Link href="/dashboard" className="button pulse">Go to Dashboard</Link>
          ) : (
            <Link href="/signup" className="button pulse">Get Started</Link>
          )}
        </div>
      </section>
      <div className="container">
        {/* Additional content can go here */}
      </div>
    </>
  )
}