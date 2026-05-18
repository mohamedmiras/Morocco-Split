import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Receipt, Users, Settings as SettingsIcon, LogOut, ChevronLeft, ChevronRight, WalletCards } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
];

export default function Sidebar() {
 const [isCollapsed, setIsCollapsed] = useState(false);
 const logout = useAuthStore((state) => state.logout);

 return (
 <motion.div 
 initial={false}
 animate={{ width: isCollapsed ? 80 : 260 }}
 className="hidden md:flex flex-col h-screen bg-white border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 relative z-30"
 >
 {/* Toggle Button */}
 <button 
 onClick={() => setIsCollapsed(!isCollapsed)}
 className="absolute -right-3.5 top-9 bg-white border border-slate-100 rounded-full p-1 shadow-sm hover:scale-110 hover:shadow-md transition-all z-40 text-slate-400 hover:text-blue-600"
 >
 {isCollapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
 </button>

 {/* Logo */}
 <div className="h-20 flex items-center px-6 border-b border-slate-50">
 <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
 <WalletCards size={20} strokeWidth={2.5} />
 </div>
 <AnimatePresence>
 {!isCollapsed && (
 <motion.span 
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -10 }}
 className="ml-3 font-extrabold text-lg text-slate-800 tracking-tight"
 >
 Moroccan<span className="text-blue-600">Split</span>
 </motion.span>
 )}
 </AnimatePresence>
 </div>

 {/* Navigation */}
 <nav className="flex-1 px-4 py-8 space-y-2">
 {navItems.map((item) => (
 <NavLink
 key={item.path}
 to={item.path}
 className={({ isActive }) => `
 flex items-center px-3.5 py-3 rounded-2xl transition-all group font-semibold
 ${isActive 
 ? 'bg-blue-50/80 text-[#0088cc] shadow-sm shadow-blue-500/5' 
 : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
 }
 `}
 >
 <item.icon size={20} className="shrink-0" strokeWidth={isCollapsed ? 2.5 : 2} />
 <AnimatePresence>
 {!isCollapsed && (
 <motion.span
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="ml-3 whitespace-nowrap tracking-wide text-[13px]"
 >
 {item.label}
 </motion.span>
 )}
 </AnimatePresence>
 </NavLink>
 ))}
 </nav>

 {/* Logout */}
 <div className="p-4 border-t border-slate-50">
 <button 
 onClick={logout}
 className="w-full flex items-center px-3.5 py-3 rounded-2xl font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors group"
 >
 <LogOut size={20} className="shrink-0 group-hover:-translate-x-1 transition-transform" strokeWidth={2} />
 <AnimatePresence>
 {!isCollapsed && (
 <motion.span
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="ml-3.5 whitespace-nowrap tracking-wide text-sm"
 >
 Logout
 </motion.span>
 )}
 </AnimatePresence>
 </button>
 </div>
 </motion.div>
 );
}

