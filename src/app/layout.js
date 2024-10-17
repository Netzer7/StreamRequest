import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import Navigation from '@/components/Navigation'
import Notification from '@/components/Notification'
import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <NotificationProvider>
            <Navigation />
            <Notification />
            <main>{children}</main>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}