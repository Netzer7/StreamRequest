'use client'

import { useNotification } from '@/app/context/NotificationContext'

export default function Notification() {
  const { notification } = useNotification()

  if (!notification) return null

  return (
    <div className={`notification ${notification.type}`}>
      {notification.message}
    </div>
  )
}