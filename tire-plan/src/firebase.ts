import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDT_No1C983ICcO_uc5eRG8I790Soc1B1M",
  authDomain: "tire-plan.firebaseapp.com",
  projectId: "tire-plan",
  storageBucket: "tire-plan.firebasestorage.app",
  messagingSenderId: "280128982798",
  appId: "1:280128982798:web:6fcf69018e30c4b4ae115f",
  measurementId: "G-ZZ6FK6TRVW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;
