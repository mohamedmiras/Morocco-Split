import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Plus, LayoutDashboard } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuthStore } from '../store/authStore';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot } from '../lib/firestoreWrapper';
import CreateGroupModal from '../components/groups/CreateGroupModal';

export default function Groups() {
  const user = useAuthStore((state) => state.user);
  const [groups, setGroups] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // We fetch groups where the user is a member by matching student_id
    const q = query(
      collection(db, 'groups'),
      where('memberUids', 'array-contains', user.student_id?.toString())
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(fetched.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Your Groups</h1>
                <p className="text-[12px] text-slate-500 mt-0.5 font-medium">Manage your shared trips and rooms.</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold rounded-xl transition-all flex items-center gap-2 shadow-[0_4px_12px_rgba(37,99,235,0.15)]"
              >
                <Plus size={16} strokeWidth={3} />
                Create Group
              </button>
            </motion.div>

            {loading ? (
               <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div></div>
            ) : groups.length === 0 ? (
               <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <Users size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-bold text-slate-800">No groups yet</h3>
                  <p className="text-sm text-slate-500 mt-2">Create a group to start splitting expenses for your next trip or room.</p>
               </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {groups.map(group => (
                  <Link key={group.id} to={`/groups/${group.id}`}>
                    <motion.div 
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-lg transition-all cursor-pointer h-full"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        {group.photoURL ? (
                          <img src={group.photoURL} alt={group.name} className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl shrink-0">
                            {group.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-slate-900 leading-tight">{group.name}</h3>
                          <p className="text-[11px] text-slate-500 mt-1 font-medium">{group.members?.length || 0} Members</p>
                        </div>
                      </div>
                      <p className="text-[12px] text-slate-600 line-clamp-2 leading-relaxed">{group.description || "No description provided."}</p>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateGroupModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
}
