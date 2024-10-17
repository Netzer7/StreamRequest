import { AuthProvider } from './context/AuthContext'
import Navigation from '@/components/Navigation'
import './globals.css'

export const metadata = {
  title: 'StreamRequest',
  description: 'Manage your Plex media requests',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <header>
            <Navigation />
          </header>
          <main className="container">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}