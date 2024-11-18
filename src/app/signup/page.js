'use client'

import { useState, useEffect } from 'react'
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
  const [stage, setStage] = useState('account')
  const [isVerifying, setIsVerifying] = useState(false)
  const [temporaryData, setTemporaryData] = useState(null)
  
  // Verification cooldown states
  const [cooldownTime, setCooldownTime] = useState(0)
  const [canResend, setCanResend] = useState(true)
  const [attempts, setAttempts] = useState(0)
  const COOLDOWN_DURATION = 180 // 3 minutes in seconds
  const MAX_ATTEMPTS = 3
  
  const { signup, loginWithGoogle } = useAuth()
  const { showNotification } = useNotification()
  const router = useRouter()

  // Cooldown timer effect
  useEffect(() => {
    let timer
    if (cooldownTime > 0) {
      timer = setInterval(() => {
        setCooldownTime(time => {
          if (time <= 1) {
            setCanResend(true)
            return 0
          }
          return time - 1
        })
      }, 1000)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [cooldownTime])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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

    if (attempts >= MAX_ATTEMPTS) {
      showNotification('Maximum verification attempts reached. Please try again later.', 'error')
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
      setAttempts(prev => prev + 1)
      setCanResend(false)
      setCooldownTime(COOLDOWN_DURATION)
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
      // First verify the phone number
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

      // After phone verification succeeds, create the account
      let userCredential;
      if (temporaryData.isGoogle) {
        userCredential = await loginWithGoogle()
      } else {
        userCredential = await signup(temporaryData.email, temporaryData.password)
      }

      // Create the user profile with verified phone
      await createUserProfile(userCredential.user.uid, {
        email: userCredential.user.email,
        phoneNumber: phoneNumber.replace(/\D/g, ''),
        phoneVerified: true,
        createdAt: new Date().toISOString()
      })
  
      showNotification('Account created successfully!', 'success')
      router.push('/dashboard')
    } catch (error) {
      console.error('Account creation error:', error)
      showNotification(error.message, 'error')
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

    // Store the credentials temporarily
    setTemporaryData({
      email,
      password,
      isGoogle: false
    })
    
    // Move to phone verification
    setStage('phone')
  }

  const handleGoogleSignIn = async () => {
    setError('')
    
    // Store that we're using Google sign in
    setTemporaryData({
      isGoogle: true
    })
    
    // Move to phone verification
    setStage('phone')
  }

  if (stage === 'phone') {
    return (
      <div className="container">
        <div className="card login-card">
          <h1 className="card-title">Verify Your Phone</h1>
          {error && <p className="error">{error}</p>}
          
          <div className="login-form">
            <div className="input-group">
              <label htmlFor="phoneNumber">Phone Number</label>
              <div className="flex flex-col " style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="(555) 555-5555"
                  disabled={isLoading || isVerifying}
                  className="mb-20"
                />
                <button
                  type="button"
                  onClick={requestVerificationCode}
                  className="button"
                  disabled={isLoading || (!canResend && isVerifying) || !validatePhoneNumber(phoneNumber)}
                >
                  {isLoading ? 'Sending...' : 
                   !canResend && cooldownTime > 0 ? `Resend in ${formatTime(cooldownTime)}` :
                   isVerifying ? 'Resend Code' : 'Send Code'}
                </button>
              </div>
              {attempts > 0 && attempts < MAX_ATTEMPTS && (
                <p className="text-sm text-gray-400 mt-1">
                  {MAX_ATTEMPTS - attempts} attempts remaining
                </p>
              )}
            </div>

            {isVerifying && (
              <div className="input-group">
                <label htmlFor="verificationCode">Verification Code</label>
                <input
                  id="verificationCode"
                  name="verification-code" 
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={isLoading}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength="6"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-form-type="other"
                  aria-label="Enter verification code"
                />
                <button
                  type="button"
                  onClick={verifyCode}
                  className="button"
                  disabled={isLoading || !verificationCode}
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card login-card">
        <h1 className="card-title">Sign Up</h1>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleInitialSignup} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="button"
            disabled={isLoading}
          >
            Continue
          </button>
        </form>

        <div className="divider">OR</div>

        <button
          onClick={handleGoogleSignIn}
          className="button google-button"
          disabled={isLoading}
        >
          Continue with Google
        </button>

        <p className="auth-switch">
          Already have an account? <Link href="/login">Log In</Link>
        </p>
      </div>
    </div>
  )
}