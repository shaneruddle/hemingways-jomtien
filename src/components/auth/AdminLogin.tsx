import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../../firebase';
import { LogIn, Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Login successful!");
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Login error:", error);
      let message = "Invalid email or password.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = "Invalid credentials. Please check your email and password.";
      } else if (error.code === 'auth/invalid-credential') {
        message = "Login failed. Please verify your credentials.";
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
      toast.success("Successfully logged in!");
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Google login failed:', error);
      let message = "Google login failed. Please try again.";
      if (error.code === 'auth/unauthorized-domain') {
        message = "This domain is not authorized in Firebase. Please add the preview URLs to 'Authorized Domains' in your Firebase Console.";
      } else if (error.code === 'auth/popup-blocked') {
        message = "Login popup was blocked. Please allow popups for this site.";
      }
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-navy hover:text-gold transition-colors mb-8 font-bold">
          <ArrowLeft size={20} /> Back to Hemingways
        </Link>
        
        <div className="bg-white rounded-[40px] shadow-2xl shadow-navy/5 overflow-hidden border border-navy/5">
          <div className="p-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-display font-bold text-navy mb-2">Staff Login</h1>
              <p className="text-gray-500 text-sm italic">Enter your credentials to access the dashboard</p>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-navy uppercase tracking-widest mb-2 ml-4">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-cream border-none rounded-2xl py-4 pl-12 pr-6 text-ink focus:ring-2 focus:ring-gold outline-none transition-all"
                    placeholder="admin@hemingwaysjomtien.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy uppercase tracking-widest mb-2 ml-4">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-cream border-none rounded-2xl py-4 pl-12 pr-6 text-ink focus:ring-2 focus:ring-gold outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-navy text-white rounded-2xl py-4 font-bold hover:bg-gold transition-all shadow-xl shadow-navy/20 flex items-center justify-center gap-2 disabled:opacity-70 group"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <LogIn size={20} className="group-hover:translate-x-1 transition-transform" /> Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <div className="h-px bg-gray-100 flex-1"></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Or continue with</span>
              <div className="h-px bg-gray-100 flex-1"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full mt-8 bg-white border-2 border-gray-100 rounded-2xl py-3 flex items-center justify-center gap-3 font-bold text-ink hover:border-gold transition-all"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </button>
          </div>
          
          <div className="bg-navy p-6 text-center">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
              Hemingways Jomtien Administrative Access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
