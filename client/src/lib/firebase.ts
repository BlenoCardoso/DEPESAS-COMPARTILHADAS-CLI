import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

// Configuração do Firebase usando variáveis de ambiente
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log("Firebase config carregado:", firebaseConfig);

// Validar configuração
const requiredFields = [
  'apiKey', 'authDomain', 'projectId', 'storageBucket', 
  'messagingSenderId', 'appId'
];

for (const field of requiredFields) {
  if (!firebaseConfig[field as keyof typeof firebaseConfig]) {
    console.warn(`Firebase: ${field} não configurado no .env`);
  }
}

// Inicializar Firebase
export const app = initializeApp(firebaseConfig);

// Inicializar serviços
export const auth = getAuth(app);
// Firestore com ignoreUndefinedProperties para evitar erros ao enviar campos não definidos
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

// Provider do Google
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Tipos úteis
export type { User } from "firebase/auth";
export type { Firestore, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
