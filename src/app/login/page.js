'use client'

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loginWithGoogle } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError('Failed to log in: ' + err.message)
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
      <h1>Login</h1>
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
        <button type="submit">Log In</button>
      </form>
      <div className="divider">OR</div>
      <button onClick={handleGoogleSignIn} className="google-button">
        Sign in with Google
      </button>
      <p>
        Don't have an account? <Link href="/signup">Sign Up</Link>
      </p>
    </div>
  )
}