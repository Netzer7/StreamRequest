'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useNotification } from '@/app/context/NotificationContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const { signup, loginWithGoogle } = useAuth()
  const { showNotification } = useNotification()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Passwords don't match")
      showNotification("Passwords don't match", 'error')
      return
    }
    try {
      setError('')
      await signup(email, password)
      showNotification('Account created successfully!', 'success')
      router.push('/dashboard')
    } catch (error) {
      setError('Failed to create an account: ' + error.message)
      showNotification('Failed to create an account', 'error')
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    try {
      await loginWithGoogle()
      showNotification('Signed in with Google successfully!', 'success')
      router.push('/dashboard')
    } catch (err) {
      setError('Failed to sign in with Google: ' + err.message)
      showNotification('Failed to sign in with Google', 'error')
    }
  }

  return (
    <div className="container">
      <div className="card login-card">
        <h1 className="card-title">Sign Up</h1>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
            />
          </div>
          <button type="submit" className="button">Sign Up</button>
        </form>
        <div className="divider">OR</div>
        <button onClick={handleGoogleSignIn} className="button google-button">
          Sign up with Google
        </button>
        <p className="auth-switch">
          Already have an account? <Link href="/login">Log In</Link>
        </p>
      </div>
    </div>
  )
}