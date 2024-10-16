import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

  const firebaseConfig = {
    apiKey: "AIzaSyAJ7YLRbtSmka5LkY8Xey1VepWv_1D_Urs",
    authDomain: "streamrequest-705e8.firebaseapp.com",
    projectId: "streamrequest-705e8",
    storageBucket: "streamrequest-705e8.appspot.com",
    messagingSenderId: "209352078218",
    appId: "1:209352078218:web:ed5149bebfc225f378ce73",
    measurementId: "G-3J66P7LR6V"
  };

  const app = initializeApp(firebaseConfig)
  export const auth = getAuth(app)