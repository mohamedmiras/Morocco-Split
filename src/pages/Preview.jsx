import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { setDemoMode } from '../lib/demoData';
import Dashboard from './Dashboard';
import { Sparkles, Users, Lock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Preview() {
  const { setUser, setAuthenticated, setLoading } = useAuthStore();
  const [showDemo, setShowDemo] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // We start on the landing screen, no demo mode yet.
  }, []);

  const handleEnterDemo = () => {
    setDemoMode(true);
    setUser({
      id: 'demo-user-1',
      name: 'Alex Visitor',
      student_id: '900',
      email: 'alex@demo.com',
      role: 'member'
    });
    setAuthenticated(true);
    setLoading(false);
    setShowDemo(true);
  };

  if (showDemo) {
    return (
      <div className="relative">
        {/* Banner indicating this is a demo */}
        <div className="bg-emerald-500 text-white text-xs font-bold text-center py-1.5 px-4 shadow-sm relative z-50 flex items-center justify-center gap-2">
          <Sparkles size={14} />
          You are in Interactive Demo Mode. Data is temporary and private.
          <button onClick={() => window.location.reload()} className="ml-2 underline text-white/80 hover:text-white">Exit Demo</button>
        </div>
        {/* Render the actual Dashboard component */}
        <Dashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12 relative z-10 text-center border border-slate-100"
      >
        <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L20 7L12 12L4 7L12 2Z" fill="white" fillOpacity="0.8"/>
            <path d="M4 17L12 22L20 17V7L12 12L4 7V17Z" fill="white"/>
          </svg>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
          Morocco Split
        </h1>
        <p className="text-slate-500 text-lg mb-8 font-medium">
          The ultimate expense splitting architecture. Built for student dorms, built for privacy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-left">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <Users className="text-blue-500 mb-2" size={24} />
            <h3 className="font-bold text-sm text-slate-800">Room vs Indiv</h3>
            <p className="text-xs text-slate-500 mt-1">Strict ledger separation.</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <Lock className="text-emerald-500 mb-2" size={24} />
            <h3 className="font-bold text-sm text-slate-800">100% Private</h3>
            <p className="text-xs text-slate-500 mt-1">No backend traces left.</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <Sparkles className="text-purple-500 mb-2" size={24} />
            <h3 className="font-bold text-sm text-slate-800">Interactive Demo</h3>
            <p className="text-xs text-slate-500 mt-1">Try the live dashboard.</p>
          </div>
        </div>

        <button 
          onClick={handleEnterDemo}
          className="w-full bg-slate-900 hover:bg-black text-white text-lg font-bold py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 group"
        >
          Enter Live Demo 
          <ChevronRight className="group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-xs text-slate-400 mt-6 font-medium">
          * This demo uses an isolated in-memory dataset. <br/> No real student data is exposed.
        </p>
      </motion.div>
    </div>
  );
}
