import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAh3MssqO2lrm7CmL36D0Bq_IKp6NG_wxA",
    authDomain: "inventario-29.firebaseapp.com",
    projectId: "inventario-29",
    storageBucket: "inventario-29.firebasestorage.app",
    messagingSenderId: "937340990491",
    appId: "1:937340990491:web:f5c583e995e5c9284134be",
    measurementId: "G-B27JJXMMRH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, collection, getDocs };