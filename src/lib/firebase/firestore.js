import { doc, setDoc } from 'firebase/firestore'
import { db } from './firebase'

export async function createUserProfile(userId, data) {
    console.log('Creating user profile for:', userId) // Debug log
  
    if (!userId) {
      throw new Error('User ID is required')
    }
  
    try {
      const userRef = doc(db, 'users', userId)
      
      const profileData = {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uid: userId // Add user ID to the document
      }
  
      console.log('Attempting to write profile data:', profileData) // Debug log
  
      await setDoc(userRef, profileData, { merge: true })
      
      console.log('User profile created successfully')
      return true
    } catch (error) {
      console.error('Detailed error creating user profile:', {
        error: error.message,
        code: error.code,
        userId,
        data
      })
      throw error
    }
  }