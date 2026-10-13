import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  db,
  FirebaseUser,
  getFirebaseAuthErrorMessage
} from '../lib/firebase';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { CloudSyncService } from '../services/cloudSyncService';

export type UserRole = 'ADMINISTRADOR' | 'ENCARGADO' | 'CAJERO' | 'REPOSITOR';

export interface SupermarketUserProfile {
  userId: string;
  displayName: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  pin?: string;
  phone?: string;
  terminalDefault?: string;
  createdAt?: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | { uid: string; email: string; displayName: string } | null;
  activeProfile: SupermarketUserProfile | null;
  usersList: SupermarketUserProfile[];
  loading: boolean;
  isAdmin: boolean;
  isEncargado: boolean;
  isCajero: boolean;
  isRepositor: boolean;
  tenantId: string;
  loginWithGoogle: () => Promise<void>;
  loginWithEmailPassword: (email: string, pass: string) => Promise<void>;
  registerUser: (newUser: Omit<SupermarketUserProfile, 'userId' | 'createdAt'>, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | { uid: string; email: string; displayName: string } | null>(() => {
    const saved = localStorage.getItem('supermarcket_auth_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (_e) {}
    }
    return null;
  });

  const [activeProfile, setActiveProfile] = useState<SupermarketUserProfile | null>(() => {
    const saved = localStorage.getItem('supermarcket_active_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (_e) {}
    }
    return null;
  });

  const [usersList, setUsersList] = useState<SupermarketUserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const tenantId = activeProfile?.tenantId || 'supermarcket-central';

  // Guardar usuario activo en localStorage
  useEffect(() => {
    if (activeProfile) {
      localStorage.setItem('supermarcket_active_user', JSON.stringify(activeProfile));
      CloudSyncService.startPresenceHeartbeat(activeProfile.displayName, activeProfile.role);
    } else {
      localStorage.removeItem('supermarcket_active_user');
    }
  }, [activeProfile]);

  // Escuchar usuarios del tenant en Firestore
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'tenants', tenantId, 'users'), (snapshot) => {
        if (!snapshot.empty) {
          const list: SupermarketUserProfile[] = [];
          snapshot.forEach(d => {
            list.push(d.data() as SupermarketUserProfile);
          });
          setUsersList(list);
        }
      }, (_err) => {
        // El perfil debe existir y estar autorizado en Firestore.
      });
      return () => unsub();
    } catch (_e) {}
  }, [tenantId]);

  // Firebase auth state observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userObj = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Usuario SuperMarcket',
        };
        setCurrentUser(userObj);
        localStorage.setItem('supermarcket_auth_user', JSON.stringify(userObj));

        try {
          // Read from multi-tenant path /tenants/{tenantId}/users/{uid}
          const userDocRef = doc(db, 'tenants', 'supermarcket-central', 'users', firebaseUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setActiveProfile(docSnap.data() as SupermarketUserProfile);
          } else {
            const newProfile: SupermarketUserProfile = {
              userId: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Usuario autorizado',
              email: firebaseUser.email || '',
              role: 'CAJERO',
              tenantId: 'supermarcket-central',
              terminalDefault: 'CAJA-01',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            setActiveProfile(newProfile);
          }
        } catch (_e) {
          setActiveProfile(null);
        }
      } else if (import.meta.env.PROD) {
        setCurrentUser(null);
        setActiveProfile(null);
        localStorage.removeItem('supermarcket_auth_user');
        localStorage.removeItem('supermarcket_active_user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      if (!['auth/popup-closed-by-user', 'auth/popup-blocked'].includes(e?.code)) {
        console.error('Error Google Sign-in:', e);
      }
      throw new Error(getFirebaseAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmailPassword = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e: any) {
      if (!['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(e?.code)) {
        console.error('Error Email Sign-in:', e);
      }
      throw new Error(getFirebaseAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  // Registro de usuarios: ADMIN -> Backend -> Rol asignado (NUNCA el usuario cliente se asigna su rol)
  const registerUser = async (
    newUser: Omit<SupermarketUserProfile, 'userId' | 'createdAt'>,
    password?: string
  ) => {
    if (!isAdmin) {
      throw new Error('Solo un Administrador puede crear usuarios y asignar roles en SuperMarcket.');
    }

    try {
      const res = await fetch('/api/auth/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.currentUser ? { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` } : {}),
        },
        body: JSON.stringify({
          displayName: newUser.displayName,
          email: newUser.email,
          role: newUser.role,
          terminalDefault: newUser.terminalDefault,
          pin: newUser.pin,
          password,
          tenantId: tenantId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar usuario en el backend.');
      }

      if (data.user) {
        // Guardar en Firestore del tenant
        try {
          await setDoc(doc(db, 'tenants', tenantId, 'users', data.user.userId), {
            ...data.user,
            createdAt: new Date().toISOString(),
          });
        } catch (_e) {}

        setUsersList(prev => [...prev.filter(u => u.userId !== data.user.userId), data.user]);

        CloudSyncService.logAudit({
          userId: activeProfile?.userId || 'admin',
          userName: activeProfile?.displayName || 'Administrador',
          userRole: 'ADMINISTRADOR',
          terminalId: CloudSyncService.getTerminalId(),
          action: 'ALTA_USUARIO_BACKEND',
          entityType: 'usuario',
          entityId: data.user.userId,
          details: `Administrador creó usuario ${data.user.displayName} con rol ${data.user.role}`,
        });
      }
    } catch (err: any) {
      console.error('Error en registerUser:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (_e) {}
    setCurrentUser(null);
    setActiveProfile(null);
    localStorage.removeItem('supermarcket_auth_user');
    localStorage.removeItem('supermarcket_active_user');
  };

  const role = activeProfile?.role;
  const isAdmin = role === 'ADMINISTRADOR';
  const isEncargado = isAdmin || role === 'ENCARGADO';
  const isCajero = isEncargado || role === 'CAJERO';
  const isRepositor = isCajero || role === 'REPOSITOR';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activeProfile,
        usersList,
        loading,
        tenantId,
        isAdmin,
        isEncargado,
        isCajero,
        isRepositor,
        loginWithGoogle,
        loginWithEmailPassword,
        registerUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
