'use client'

import { useAuth } from '@/app/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthWrapper({ children }) {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    } else if (user === null) {  // Only redirect if we're sure the user is not authenticated
      router.push('/login')
    }
  }, [user, router])

  // While checking authentication, show nothing
  if (user === undefined) {
    return null
  }

  // If user is not authenticated, show the children (which will be the hero content)
  return children
}