import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Silence internal verbose network warnings while preserving true application errors
setLogLevel('silent');

// CRITICAL: The app will break without specifying firestoreDatabaseId
// Using experimentalForceLongPolling to prevent iframe WebChannel/WebSocket disconnects
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export function getFirebaseAuthErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';

  switch (code) {
    case 'auth/operation-not-allowed':
      return 'El proveedor de inicio de sesión está deshabilitado en Firebase. Active Correo/contraseña o Google en Firebase Console > Authentication > Sign-in method.';
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase. Añádalo en Authentication > Settings > Authorized domains.';
    case 'auth/configuration-not-found':
      return 'Firebase Authentication no está configurado para este proyecto.';
    case 'auth/invalid-api-key':
      return 'La API key de Firebase no es válida o no pertenece al proyecto configurado.';
    case 'auth/network-request-failed':
      return 'No se pudo conectar con Firebase Authentication. Compruebe la red y vuelva a intentarlo.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Permita ventanas emergentes para este sitio.';
    case 'auth/popup-closed-by-user':
      return 'El inicio de sesión de Google fue cancelado.';
    case 'auth/email-already-in-use':
      return 'Ese correo ya tiene una cuenta en Firebase.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Correo o contraseña incorrectos.';
    default:
      return error instanceof Error ? error.message : 'No se pudo completar la autenticación con Firebase.';
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  
  // Gracefully handle transient offline and unreachable connection states
  if (errorMsg.includes('client is offline') || errorMsg.includes('unavailable') || errorMsg.includes('network-request-failed')) {
    console.warn(`[Firestore Offline/Unavailable] Operation: ${operationType}, Path: ${path}`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot per Firebase guidelines
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (_error) {
    // Offline mode, permission-denied for unauthenticated root ping, or standard restricted rules are expected on startup
    return;
  }
}

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
};
export type { FirebaseUser };
