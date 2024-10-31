'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useNotification } from '@/app/context/NotificationContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createUserProfile } from '@/lib/firebase/firestore'

export default function Signup() {
  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  
  // UI states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [stage, setStage] = useState('account') // 'account' or 'phone'
  const [isVerifying, setIsVerifying] = useState(false)
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  
  const { signup, loginWithGoogle } = useAuth()
  const { showNotification } = useNotification()
  const router = useRouter()

  const formatPhoneNumber = (value) => {
    const number = value.replace(/[^\d]/g, '')
    if (number.length <= 3) return number
    if (number.length <= 6) return `(${number.slice(0, 3)}) ${number.slice(3)}`
    return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6, 10)}`
  }

  const handlePhoneChange = (e) => {
    const formattedNumber = formatPhoneNumber(e.target.value)
    setPhoneNumber(formattedNumber)
  }

  const validatePhoneNumber = (phone) => {
    const cleanNumber = phone.replace(/\D/g, '')
    return cleanNumber.length === 10
  }

  const requestVerificationCode = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      showNotification('Please enter a valid phone number', 'error')
      return
    }
  
    setIsLoading(true)
    try {
      const cleanPhoneNumber = phoneNumber.replace(/\D/g, '')
      
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: cleanPhoneNumber })
      })
  
      const data = await response.json()
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code')
      }
  
      setIsVerifying(true)
      showNotification('Verification code sent!', 'success')
    } catch (error) {
      console.error('Verification error:', error)
      showNotification(error.message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = async () => {
    setIsLoading(true)
    try {
      // First verify the code
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          code: verificationCode
        })
      })
  
      const data = await response.json()
  
      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code')
      }
  
      // Debug logging
      console.log('Current user:', currentUser)
  
      if (!currentUser?.uid) {
        throw new Error('No authenticated user found')
      }
  
      // Try to create/update profile
      await createUserProfile(currentUser.uid, {
        email: currentUser.email,
        phoneNumber: phoneNumber.replace(/\D/g, ''),
        phoneVerified: true,
        lastUpdated: new Date().toISOString()
      })
  
      setIsPhoneVerified(true)
      showNotification('Phone number verified successfully!', 'success')
      router.push('/dashboard')
    } catch (error) {
      console.error('Verification error:', {
        message: error.message,
        code: error.code,
        user: currentUser?.uid
      })
      showNotification(
        `Error: ${error.message}. Please try again or contact support.`, 
        'error'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleInitialSignup = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError("Passwords don't match")
      showNotification("Passwords don't match", 'error')
      return
    }

    setIsLoading(true)
    try {
      const userCredential = await signup(email, password)
      setCurrentUser(userCredential.user)
      setStage('phone')
      showNotification('Account created! Please verify your phone number.', 'success')
    } catch (error) {
      setError('Failed to create an account: ' + error.message)
      showNotification('Failed to create an account', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setIsLoading(true)
    try {
      const result = await loginWithGoogle()
      setCurrentUser(result.user)
      setStage('phone')
      showNotification('Signed in with Google! Please verify your phone number.', 'success')
    } catch (err) {
      setError('Failed to sign in with Google: ' + err.message)
      showNotification('Failed to sign in with Google', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (stage === 'phone') {
    return (
      <div className="container mx-auto max-w-md px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Verify Your Phone</h1>
          {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="flex gap-2">
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="(555) 555-5555"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  required
                  disabled={isLoading || isVerifying}
                />
                <button
                  type="button"
                  onClick={requestVerificationCode}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                  disabled={isLoading || isVerifying || !validatePhoneNumber(phoneNumber)}
                >
                  {isLoading ? 'Sending...' : 'Send Code'}
                </button>
              </div>
            </div>

            {isVerifying && (
              <div className="space-y-2">
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                  Verification Code
                </label>
                <input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={verifyCode}
                  className="w-full mt-2 py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                  disabled={isLoading || !verificationCode}
                >
                  Verify Code
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-md px-4">
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        <form onSubmit={handleInitialSignup} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Continue'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <span className="px-4 bg-white text-gray-500">OR</span>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full mt-4 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          disabled={isLoading}
        >
          Continue with Google
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-500 hover:text-blue-600">
            Log In
          </Link>
        </p>
      </div>
    </div>
  )
}