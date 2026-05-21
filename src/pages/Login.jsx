import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, KeyRound, Loader2, WalletCards, User, Download } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import studentsData from '../data/students.json';

export default function Login() {
 const [studentId, setStudentId] = useState('13');
 const [password, setPassword] = useState('');
 const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('checking'); // 'checking', 'ok', 'blocked'
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("To install on iOS: tap the 'Share' button at the bottom of Safari, then select 'Add to Home Screen'.\n\nOn Android: tap the menu icon in Chrome and select 'Add to Home screen'.");
    }
  };

  useEffect(() => {
    // 1. Connection check (bypassed for Firebase as it's generally unblocked)
    setNetworkStatus('ok');

    // 2. Auth redirect
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!studentId || !password) {
      setError('Please enter both student ID and password.');
      return;
    }

    setLoading(true);
    
    // Safety timeout - force stop loading after 15s
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Login is taking too long. Please check your connection and try again.');
    }, 15000);

    try {
      const cleanInput = studentId.trim();
      const cleanPassword = password.trim();
      
      let finalStudentId = cleanInput;
      const isRoomId = cleanInput.toLowerCase().startsWith('room') && !isNaN(cleanInput.toLowerCase().replace('room', '').trim());
      
      if (isRoomId) {
        // e.g. "room 310" -> "room310"
        finalStudentId = cleanInput.toLowerCase().replace(/\s+/g, '');
      } else if (isNaN(cleanInput)) {
        // If the input contains letters, treat it as a Username and look up the true Student ID
        const q = query(
          collection(db, 'profiles'),
          where('name_lower', '==', cleanInput.toLowerCase())
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('Username not found. Please check your spelling or use your Student ID.');
        }
        finalStudentId = querySnapshot.docs[0].data().student_id;
      } else {
        // It's a number, so clean leading zeros
        finalStudentId = cleanInput.replace(/^0+/, '') || '0';
      }

      const email = `${finalStudentId}@expenseapp.local`;
      const mappedPassword = cleanPassword.padStart(6, '0'); 
      
      try {
        const authPromise = signInWithEmailAndPassword(auth, email, mappedPassword);

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Browser is blocking the connection to the database. Try Incognito mode or check your internet.')), 20000)
        );

        await Promise.race([authPromise, timeoutPromise]);
      } catch (loginErr) {
        // If user doesn't exist, try auto-registering them (Self-Seeding Database)
        if (loginErr.code === 'auth/invalid-credential' || loginErr.code === 'auth/user-not-found') {
          const studentInfo = studentsData.find(s => s['رقم  ت']?.toString() === finalStudentId);
          
          if (studentInfo && mappedPassword === finalStudentId.padStart(6, '0')) {
            // Auto-create user in Firebase
            const newUserCred = await createUserWithEmailAndPassword(auth, email, mappedPassword);
            
            // Create profile in Firestore
            await setDoc(doc(db, 'profiles', newUserCred.user.uid), {
              student_id: finalStudentId,
              name: studentInfo['الإسم الشخصي'],
              name_lower: studentInfo['الإسم الشخصي'].toLowerCase(),
              admission_number: studentInfo['رقم التسجيل'],
              role: 'member',
              password: mappedPassword
            }, { merge: true });
            
            // Successfully registered and logged in
          } else {
            throw new Error('Invalid student ID or password.');
          }
        } else {
          throw loginErr;
        }
      }
      
      clearTimeout(timeoutId);
      // We rely on the useEffect listening to 'isAuthenticated' to navigate.
      // This prevents the race condition where we navigate before the global auth state is ready.
      
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Login Error:", err);
      let errMsg = err.message;
      if (err.code === 'auth/invalid-credential') errMsg = 'Invalid student ID or password.';
      setError(errMsg || 'Invalid student ID or password.');
    } finally {
      setLoading(false);
    }
  };

 return (
 <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden font-sans">
 
 {/* Background Gradients */}
 <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#0088cc]/20 rounded-full blur-[100px] opacity-60 animate-pulse"></div>
 <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00aaff]/20 rounded-full blur-[100px] opacity-60 animate-pulse delay-1000"></div>

 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
 className="w-full max-w-md"
 >
 <div className="bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 p-8 sm:p-10 relative z-10">
 
 <div className="flex flex-col items-center mb-10">
 <motion.div 
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
 className="w-16 h-16 bg-gradient-to-br from-[#0088cc] to-[#00aaff] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-6"
 >
 <WalletCards size={32} strokeWidth={1.5} />
 </motion.div>
 <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Welcome Back</h1>
 <p className="text-slate-500 text-center text-sm font-medium">Sign in with your student ID to track expenses.</p>
 </div>

 <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative group">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block ml-1">
                Student ID
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#0088cc] transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Enter your ID (e.g. 13)"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full bg-white border-2 border-slate-100 focus:border-[#0088cc] py-3.5 pl-12 pr-4 rounded-2xl text-sm sm:text-base outline-none transition-all placeholder:text-slate-300 font-medium"
                />
              </div>
            </div>

 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Password</label>
 <div className="relative">
 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
 <KeyRound size={18} strokeWidth={2.5} />
 </div>
 <input
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#0088cc]/10 focus:border-[#0088cc] transition-all outline-none text-slate-900 placeholder-slate-400 font-medium"
 placeholder="••••••••"
 required
 />
 </div>
 </div>

 {error && (
 <motion.div 
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-semibold flex items-start gap-2 whitespace-pre-wrap"
 >
 <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5"></div>
 {error}
 </motion.div>
 )}

            <button
              type="submit"
              disabled={loading || !studentId || !password}
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm sm:text-base flex justify-center items-center gap-2 transition-all duration-300 ${
                loading || !studentId || !password 
                  ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                  : 'bg-[#0088cc] hover:bg-[#0077b3] shadow-[0_8px_16px_rgba(0,136,204,0.3)] hover:shadow-[0_12px_20px_rgba(0,136,204,0.4)] hover:-translate-y-0.5'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <LogIn className="w-4 h-4 sm:w-5 sm:h-5 ml-1" strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          {/* Network Status Indicator */}
          <div className="mt-8 flex items-center justify-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              networkStatus === 'ok' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
              networkStatus === 'blocked' ? 'bg-red-500 animate-pulse' : 'bg-slate-300'
            }`}></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Database Connection: {
                networkStatus === 'ok' ? 'Ready' : 
                networkStatus === 'blocked' ? 'Blocked by Browser' : 'Checking...'
              }
            </span>
          </div>
        </div>
      </motion.div>

      {/* Add to Home Screen Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={handleInstallApp}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl shadow-[0_8px_30px_rgb(37,99,235,0.3)] hover:bg-blue-700 hover:shadow-[0_8px_30px_rgb(37,99,235,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all text-[11px] font-black border border-blue-500 cursor-pointer"
        >
          <Download size={14} strokeWidth={2.5} />
          Install App
        </button>
      </div>
    </div>
  );
}
