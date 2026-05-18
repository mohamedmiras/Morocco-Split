import { WalletCards, Menu, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSidebarStore } from '../store/sidebarStore';

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const toggleMobile = useSidebarStore((state) => state.toggleMobile);

  return (
    <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-20 flex items-center justify-between px-6 md:px-10 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
      {/* Mobile Logo & Menu Toggle */}
      <div className="flex items-center gap-4 md:hidden">
        <button 
          onClick={toggleMobile}
          className="text-slate-400 hover:text-blue-600 p-1.5 transition-colors bg-slate-50 hover:bg-blue-50 rounded-lg cursor-pointer"
        >
          <Menu size={24} strokeWidth={2.5} />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0088cc] to-[#00aaff] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <WalletCards size={20} strokeWidth={2.5} />
        </div>
      </div>

      {/* Desktop Space (Hidden on Mobile) */}
      <div className="hidden md:block">
        <div className="relative">
          <input type="text" placeholder="Search..." className="bg-slate-50 border border-slate-100 text-slate-800 text-sm rounded-full px-5 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/50 focus:bg-white transition-all" />
        </div>
      </div>

      {/* User Info & Logout */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-[13px] font-bold text-slate-800 leading-none mb-1.5">{user?.name || 'Student Name'}</p>
          <p className="text-[10px] font-bold tracking-wider text-slate-400 leading-none uppercase">ID: {user?.student_id || user?.admission_number || 'X'}</p>
        </div>
        
        <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#0088cc] font-bold border-2 border-blue-100 shrink-0 shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
          </div>
          
          <button 
            onClick={logout}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group"
            title="Logout"
          >
            <LogOut size={18} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
}
