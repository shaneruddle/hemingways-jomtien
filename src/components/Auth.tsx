import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, LogOut, User as UserIcon, ShieldCheck, Loader2 } from 'lucide-react';
import { FirebaseImage } from './ui/FirebaseImage';
import { toast } from 'sonner';

export default function Auth({ onUserChange }: { onUserChange: (user: any) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Auth: Initializing auth listener");
    // Safety timeout: if auth state doesn't resolve in 5 seconds, stop loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth: Auth state resolution timed out");
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      console.log("Auth: State changed, user:", user?.email);
      if (user) {
        // Update user profile in Firestore
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          let data: any = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified
          };
          
          if (!userSnap.exists()) {
            const initialProfile = {
              ...data,
              role: user.email?.toLowerCase() === 'info@hemingwaysjomtien.com' ? 'admin' : 'employee',
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString()
            };
            console.log("Auth: Creating initial profile for:", user.email, "Role:", initialProfile.role);
            await setDoc(userRef, initialProfile);
            data = initialProfile;
          } else {
            const existingData = userSnap.data();
            const updateData = {
              lastLogin: new Date().toISOString(),
              displayName: user.displayName || existingData.displayName,
              email: user.email || existingData.email,
              photoURL: user.photoURL || existingData.photoURL
            };
            console.log("Auth: Updating existing profile for:", user.email, "Existing Role:", existingData.role);
            await setDoc(userRef, updateData, { merge: true });
            data = { ...data, ...existingData, ...updateData };
          }
          setUser(user);
          setUserData(data);
          onUserChange(data);
        } catch (err) {
          console.error("Auth: Firestore error:", err);
          // Fallback to basic user if Firestore fails
          setUser(user);
          onUserChange({ uid: user.uid, email: user.email, role: user.email?.toLowerCase() === 'info@hemingwaysjomtien.com' ? 'admin' : 'employee' });
        }
      } else {
        setUser(null);
        setUserData(null);
        onUserChange(null);
      }
      setLoading(false);
    });
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [onUserChange]);

  const handleLogin = async () => {
    console.log("Auth: Login clicked");
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success("Successfully logged in!");
    } catch (error: any) {
      console.error('Auth: Login failed:', error);
      let message = "Login failed. Please try again.";
      if (error.code === 'auth/popup-blocked') {
        message = "Login popup was blocked by your browser. Please allow popups for this site.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "This domain is not authorized in Firebase Console. Please add the app domain to Authorized Domains.";
      }
      toast.error(message);
    }
  };

  const handleLogout = async () => {
    console.log("Auth: Logout clicked");
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Auth: Logout failed:', error);
    }
  };

  if (loading) return (
    <div className="flex items-center gap-2 px-6 py-2 bg-white/80 text-navy rounded-full text-sm font-bold shadow-lg border border-navy/20 animate-pulse">
      <Loader2 className="animate-spin" size={18} /> Checking...
    </div>
  );

  return (
    <div className="flex items-center gap-4">
      {user ? (
        <div className="flex items-center gap-4 bg-white p-2 rounded-full shadow-lg border border-gray-100">
          <div className="flex items-center gap-2 px-3">
            {user.photoURL ? (
              <FirebaseImage src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-cream flex items-center justify-center text-navy font-bold">
                {user.email ? user.email[0].toUpperCase() : <UserIcon size={16} />}
              </div>
            )}
            <div className="hidden md:block">
              <div className="flex items-center gap-1">
                <p className="text-xs font-bold text-ink leading-none">{user.displayName || user.email?.split('@')[0]}</p>
                {userData?.role === 'admin' && (
                  <ShieldCheck size={12} className="text-navy" />
                )}
              </div>
              <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      ) : (
        <Link 
          to="/admin/login"
          className="flex items-center gap-2 px-8 py-3 bg-navy text-white rounded-full hover:bg-gold transition-all text-sm font-bold shadow-xl border-2 border-white/20 group"
        >
          <LogIn size={18} className="group-hover:translate-x-1 transition-transform" /> Admin Login
        </Link>
      )}
    </div>
  );
}
