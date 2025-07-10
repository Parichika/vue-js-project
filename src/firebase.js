// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCs8MlL_mNKB-KWKAZYLkK6e7SIx4Ug2DE",
  authDomain: "counselling-service-eae28.firebaseapp.com",
  projectId: "counselling-service-eae28",
  storageBucket: "counselling-service-eae28.firebasestorage.app",
  messagingSenderId: "274657146461",
  appId: "1:274657146461:web:feb4c39937eac4a47f7fb4",
  measurementId: "G-V2HFNZ9JPG"

};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);