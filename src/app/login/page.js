'use client'

import { useState } from 'react'
import { useAuth } from '@/app/context/AuthContext'
import { useNotification } from '@/app/context/NotificationContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loginWithGoogle } = useAuth()
  const { showNotification } = useNotification()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      showNotification('Logged in successfully!', 'success')
      router.push('/dashboard')
    } catch (err) {
      setError('Failed to log in: ' + err.message)
      showNotification('Failed to log in', 'error')
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
        <h1 className="card-title">Login</h1>
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
          <button type="submit" className="button">Log In</button>
        </form>
        <div className="divider">OR</div>
        <button onClick={handleGoogleSignIn} className="button google-button">
          Sign in with Google
        </button>
        <p className="auth-switch">
          Don't have an account? <Link href="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  )
}