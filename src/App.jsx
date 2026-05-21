import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, Component } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthStore } from './store/authStore';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDashboard from './pages/GroupDashboard';

// Simple Error Boundary
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Something went wrong</h2>
          <pre className="p-4 bg-red-50 text-red-600 rounded-xl text-xs max-w-lg overflow-auto text-left">
            {this.state.error?.message}
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-slate-400 text-xs font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  const { setUser, setLoading, setAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    const updateUserData = async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      const studentId = firebaseUser.email?.split('@')[0] || '';
      try {
        const docRef = doc(db, 'profiles', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        let profile = {};
        
        if (docSnap.exists()) {
          profile = docSnap.data();
        }

        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          student_id: studentId,
          ...profile
        });
        setAuthenticated(true);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          student_id: studentId
        });
        setAuthenticated(true);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      await updateUserData(firebaseUser);
    });

    return () => unsubscribe();
  }, [setUser, setLoading, setAuthenticated]);

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-white">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
            <Route path="/groups/:groupId" element={<ProtectedRoute><GroupDashboard /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
