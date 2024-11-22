'use client'

import { useNotification } from '@/app/context/NotificationContext'

export default function Notification() {
  const { notification } = useNotification()

  if (!notification) return null

  const { type, message } = notification

  return (
    <div className={`notification ${type}`}>
      {message}
    </div>
  )
}