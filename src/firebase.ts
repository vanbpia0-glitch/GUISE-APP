// Firebase init. Kept as .ts (not .js) so it participates in the project's
// TypeScript build like every other module — Vite/tsc treat them identically.
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCz6EJHRfpe1SEmah_S-RnbOK-rOSL5DZU',
  authDomain: 'guise-10570.firebaseapp.com',
  projectId: 'guise-10570',
  storageBucket: 'guise-10570.firebasestorage.app',
  messagingSenderId: '176660688556',
  appId: '1:176660688556:web:7552e1feb8615bedee7909',
  measurementId: 'G-1N31MJJ4H7',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export { signInAnonymously, onAuthStateChanged };
