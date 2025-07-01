// src/firebase.js

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyBoTjSpmUCMiaw0rM01565kTmXSbt4VyhU",
    authDomain: "counselling-queue-booking.firebaseapp.com",
    projectId: "counselling-queue-booking",
    storageBucket: "counselling-queue-booking.firebasestorage.app",
    messagingSenderId: "546226276029",
    appId: "1:546226276029:web:29d52c69b0f4698ac7d9d4",
    measurementId: "G-Y1RRH9921S"
  };
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const provider = new GoogleAuthProvider()

export { auth, provider, signInWithPopup }
