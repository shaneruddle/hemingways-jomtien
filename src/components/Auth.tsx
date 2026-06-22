import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, LogOut, User as UserIcon, ShieldCheck, Loader2 } from 'lucide-react';
import { FirebaseImage } from './ui/FirebaseImage';
import { toast } from 'sonner';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  ink700:  '#1C1C1C',
  ink600:  '#262524',
  ink500:  '#3A3734',
  gold500: '#D49F3D',
  gold400: '#E3B860',
  cream50: '#F6F1E6',
  cream100:'#E9E0CE',
  muted:   '#A39A8C',
  faint:   '#7E766A',
  border:  'rgba(246,241,230,0.12)',
  borderStrong: 'rgba(246,241,230,0.28)',
};

export default function Auth({ onUserChange }: { onUserChange: (user: any) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Auth: Initializing auth listener');
    // Safety timeout: if auth state doesn't resolve in 5 seconds, stop loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth: Auth state resolution timed out');
        setLoading(false);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      console.log('Auth: State changed, user:', user?.email);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          let data: any = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
          };

          if (!userSnap.exists()) {
            const initialProfile = {
              ...data,
              role: user.email?.toLowerCase() === 'info@hemingwaysjomtien.com' ? 'admin' : 'employee',
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
            };
            console.log('Auth: Creating initial profile for:', user.email, 'Role:', initialProfile.role);
            await setDoc(userRef, initialProfile);
            data = initialProfile;
          } else {
            const existingData = userSnap.data();
            const updateData = {
              lastLogin: new Date().toISOString(),
              displayName: user.displayName || existingData.displayName,
              email: user.email || existingData.email,
              photoURL: user.photoURL || existingData.photoURL,
            };
            console.log('Auth: Updating existing profile for:', user.email, 'Existing Role:', existingData.role);
            await setDoc(userRef, updateData, { merge: true });
            data = { ...data, ...existingData, ...updateData };
          }
          setUser(user);
          setUserData(data);
          onUserChange(data);
        } catch (err) {
          console.error('Auth: Firestore error:', err);
          setUser(user);
          onUserChange({
            uid: user.uid,
            email: user.email,
            role: user.email?.toLowerCase() === 'info@hemingwaysjomtien.com' ? 'admin' : 'employee',
          });
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
    console.log('Auth: Login clicked');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Successfully logged in!');
    } catch (error: any) {
      console.error('Auth: Login failed:', error);
      let message = 'Login failed. Please try again.';
      if (error.code === 'auth/popup-blocked') {
        message = 'Login popup was blocked by your browser. Please allow popups for this site.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized in Firebase Console. Please add the app domain to Authorized Domains.';
      }
      toast.error(message);
    }
  };

  const handleLogout = async () => {
    console.log('Auth: Logout clicked');
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Auth: Logout failed:', error);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 16px',
        background: T.ink700,
        border: `1px solid ${T.border}`,
        borderRadius: 2,
        fontFamily: "'Oswald', sans-serif",
        fontSize: 12,
        letterSpacing: '0.08em',
        color: T.muted,
        opacity: 0.7,
      }}>
        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
        Checking...
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Logged in state ──
  if (user) {
    const initial = user.email ? user.email[0].toUpperCase() : '';
    const displayName = user.displayName || user.email?.split('@')[0] || '';

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        background: T.ink700,
        border: `1px solid ${T.border}`,
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        {/* Avatar + info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
        }}>
          {user.photoURL ? (
            <FirebaseImage
              src={user.photoURL}
              alt={user.displayName || ''}
              style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: T.gold500,
              color: '#141414',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}>
              {initial || <UserIcon size={14} />}
            </div>
          )}

          <div style={{ display: 'none' }} className="md-show">
            {/* Using a wrapper div for the responsive hidden text */}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                fontFamily: "'Barlow', sans-serif",
                fontWeight: 600,
                fontSize: 12,
                color: T.cream50,
                whiteSpace: 'nowrap',
              }}>
                {displayName}
              </span>
              {userData?.role === 'admin' || userData?.role === 'super_admin' ? (
                <ShieldCheck size={11} style={{ color: T.gold400, flexShrink: 0 }} />
              ) : null}
            </div>
            <span style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: 10,
              letterSpacing: '0.08em',
              color: T.muted,
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user.email}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 36, background: T.border, flexShrink: 0 }} />

        {/* Sign out button */}
        <button
          onClick={handleLogout}
          title="Sign out"
          style={{
            padding: '6px 12px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: T.faint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#EF4444';
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = T.faint;
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    );
  }

  // ── Logged out state ──
  return (
    <Link
      to="/admin/login"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        background: T.ink700,
        border: `1px solid ${T.borderStrong}`,
        borderRadius: 2,
        color: T.gold400,
        fontFamily: "'Oswald', sans-serif",
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        transition: 'border-color 0.15s, color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = T.gold500;
        el.style.background = T.ink600;
        el.style.color = T.cream50;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = T.borderStrong;
        el.style.background = T.ink700;
        el.style.color = T.gold400;
      }}
    >
      <LogIn size={14} />
      Admin Login
    </Link>
  );
}
