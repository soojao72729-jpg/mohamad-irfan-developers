// FIREBASE CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyAD9JCcgCDSa9NT1QMs4H-x1uLOixb5gtw",
    authDomain: "irfan-developers.firebaseapp.com",
    databaseURL: "https://irfan-developers-default-rtdb.firebaseio.com", // Common default for Realtime DB
    projectId: "irfan-developers",
    storageBucket: "irfan-developers.firebasestorage.app",
    messagingSenderId: "688049060539",
    appId: "1:688049060539:web:9aab8017ee6ee47b3d479e",
    measurementId: "G-PSWC17YCSH"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const propertiesRef = db.ref('properties');
const inquiriesRef = db.ref('inquiries');
const officeRef = db.ref('office_data');
const hctaRef = db.ref('hcta_data');
const settingsRef = db.ref('settings');
