import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../../firebase';
import { LogIn, Mail, Lock, Loader2, ArrowLeft, Globe } from 'lucide-react';
import { toast } from 'sonner';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  ink850:  '#141414',
  ink700:  '#1C1C1C',
  ink600:  '#262524',
  ink500:  '#3A3734',
  gold500: '#D49F3D',
  gold400: '#E3B860',
  teal400: '#34B2BA',
  cream50: '#F6F1E6',
  muted:   '#A39A8C',
  faint:   '#7E766A',
  border:  'rgba(246,241,230,0.12)',
  borderStrong: 'rgba(246,241,230,0.28)',
};

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      let message = 'Invalid email or password.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Invalid credentials. Please check your email and password.';
      } else if (error.code === 'auth/invalid-credential') {
        message = 'Login failed. Please verify your credentials.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Email/Password login is not enabled in Firebase. Please enable it in the Firebase Console.';
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Successfully logged in!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Google login failed:', error);
      let message = 'Google login failed. Please try again.';
      if (error.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized in Firebase. Please add the preview URLs to Authorized Domains in your Firebase Console.';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'Login popup was blocked. Please allow popups for this site.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Google login is not enabled in Firebase. Please enable it in the Sign-in method section of your Firebase Console.';
      }
      toast.error(message);
    }
  };

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: '100%',
    background: T.ink700,
    border: `1px solid ${focused ? T.gold500 : T.ink500}`,
    borderRadius: 2,
    padding: '12px 14px 12px 42px',
    color: T.cream50,
    fontFamily: "'Barlow', sans-serif",
    fontSize: 14,
    outline: 'none',
    boxShadow: focused ? `0 0 0 2px rgba(212,159,61,0.25)` : 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: T.ink850,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      fontFamily: "'Barlow', sans-serif",
    }}>
      {/* Back link */}
      <div style={{ position: 'absolute', top: 24, left: 28 }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: T.teal400,
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '0.75'}
          onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '1'}
        >
          <ArrowLeft size={14} /> Back to Hemingways
        </Link>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: T.ink700,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        boxShadow: '0 10px 28px rgba(0,0,0,0.55)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '36px 32px 32px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img
              src="/assets/logo/hemingways-logo-white.png"
              alt="Hemingways Jomtien"
              style={{ height: 52, objectFit: 'contain', display: 'inline-block' }}
            />
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{
              fontFamily: "'Anton', sans-serif",
              fontSize: 36,
              fontWeight: 400,
              textTransform: 'uppercase',
              color: T.cream50,
              margin: '0 0 6px',
              letterSpacing: '0.04em',
            }}>
              Staff Login
            </h1>
            <p style={{
              fontFamily: "'Lora', serif",
              fontStyle: 'italic',
              fontSize: 14,
              color: T.muted,
              margin: 0,
            }}>
              Enter your credentials to access the dashboard
            </p>
          </div>

          {/* Divider */}
          <div style={{ borderTop: `1px solid ${T.border}`, marginBottom: 24 }} />

          {/* Form */}
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Oswald', sans-serif",
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: T.muted,
                marginBottom: 6,
              }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: emailFocus ? T.gold400 : T.faint,
                    pointerEvents: 'none',
                    transition: 'color 0.15s',
                  }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setEmailFocus(true)}
                  onBlur={() => setEmailFocus(false)}
                  placeholder="admin@hemingwaysjomtien.com"
                  style={inputStyle(emailFocus)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: "'Oswald', sans-serif",
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: T.muted,
                marginBottom: 6,
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: passFocus ? T.gold400 : T.faint,
                    pointerEvents: 'none',
                    transition: 'color 0.15s',
                  }}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPassFocus(true)}
                  onBlur={() => setPassFocus(false)}
                  placeholder="••••••••"
                  style={inputStyle(passFocus)}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 0',
                background: loading ? T.ink500 : T.gold500,
                border: 'none',
                borderRadius: 2,
                color: loading ? T.muted : T.ink850,
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.15s, color 0.15s',
                marginTop: 4,
              }}
              onMouseEnter={e => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.background = T.gold400;
              }}
              onMouseLeave={e => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.background = T.gold500;
              }}
            >
              {loading ? (
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <LogIn size={17} /> Sign In
                </>
              )}
            </button>
          </form>

          {/* Or divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, borderTop: `1px solid ${T.border}` }} />
            <span style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: T.faint,
            }}>
              Or continue with
            </span>
            <div style={{ flex: 1, borderTop: `1px solid ${T.border}` }} />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            style={{
              width: '100%',
              padding: '12px 0',
              background: T.ink600,
              border: `1px solid ${T.borderStrong}`,
              borderRadius: 2,
              color: T.cream50,
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 500,
              fontSize: 13,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = T.gold400;
              (e.currentTarget as HTMLButtonElement).style.background = '#2E2B29';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = T.borderStrong;
              (e.currentTarget as HTMLButtonElement).style.background = T.ink600;
            }}
          >
            <Globe size={16} style={{ color: T.gold400 }} />
            Sign in with Google
          </button>
        </div>

        {/* Footer bar */}
        <div style={{
          background: T.ink600,
          borderTop: `1px solid ${T.border}`,
          padding: '14px 32px',
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 10,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: T.faint,
            margin: 0,
          }}>
            Hemingways Jomtien Administrative Access
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
