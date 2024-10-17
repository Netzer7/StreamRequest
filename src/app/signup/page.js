'use client'

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const { signup, loginWithGoogle } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      return setError("Passwords don't match")
    }
    try {
      setError('')
      await signup(email, password)
      router.push('/dashboard')
    } catch (error) {
      setError('Failed to create an account: ' + error.message)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    try {
      await loginWithGoogle()
      router.push('/dashboard')
    } catch (err) {
      setError('Failed to sign in with Google: ' + err.message)
    }
  }

  return (
    <div className="card">
      <h1>Sign Up</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm Password"
          required
        />
        <button type="submit">Sign Up</button>
      </form>
      <div className="divider">OR</div>
      <button onClick={handleGoogleSignIn} className="google-button">
        Sign up with Google
      </button>
      <p>
        Already have an account? <Link href="/login">Log In</Link>
      </p>
    </div>
  )
}