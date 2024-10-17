'use client'

import React, { createContext, useState, useContext } from 'react'

const NotificationContext = createContext()

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null)

  const showNotification = (message, type, duration = 3000) => {
    setNotification({ message, type })
    setTimeout(() => {
      setNotification(null)
    }, duration)
  }

  return (
    <NotificationContext.Provider value={{ notification, showNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  return useContext(NotificationContext)
}