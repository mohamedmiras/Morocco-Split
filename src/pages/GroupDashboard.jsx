import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Receipt, TrendingUp, Plus, Edit3 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuthStore } from '../store/authStore';
import { db } from '../lib/firebase';
import { doc, collection, query, where, onSnapshot, orderBy, deleteDoc } from 'firebase/firestore';
import GroupMembersGrid from '../components/groups/GroupMembersGrid';
import GroupActivityFeed from '../components/groups/GroupActivityFeed';
import SplitExpenseModal from '../components/split/SplitExpenseModal';
import EditGroupModal from '../components/groups/EditGroupModal';
import { safeAdd, safeSubtract } from '../lib/financialMath';

export default function GroupDashboard() {
  const { groupId } = useParams();
  const user = useAuthStore((state) => state.user);
  
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    
    // Listen to group details
    const groupRef = doc(db, 'groups', groupId);
    const unsubGroup = onSnapshot(groupRef, (docSnap) => {
      if (docSnap.exists()) {
        setGroup({ id: docSnap.id, ...docSnap.data() });
      }
    });

    // Listen to group expenses
    const q = query(
      collection(db, 'expenses'),
      where('groupId', '==', groupId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in JS because we can't easily compound query with where and orderBy on different fields without index
      setExpenses(fetched.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)));
      setLoading(false);
    });

    return () => {
      unsubGroup();
      unsub();
    };
  }, [groupId]);

  const { totalExpenses, totalSettlements, memberBalances, simplifiedDebts } = useMemo(() => {
    if (!group) return { totalExpenses: 0, totalSettlements: 0, memberBalances: {}, simplifiedDebts: [] };

    let totalExp = 0;
    let totalSet = 0;
    const balances = {}; // { uid: { name, netAmount, totalPaid, totalOwes } }

    group.members?.forEach(m => {
      balances[m.uid] = { name: m.name, netAmount: 0, totalPaid: 0, totalOwes: 0 };
    });

    expenses.forEach(exp => {
      const isSettlement = exp.category === 'transfer' || exp.category === 'settlement';
      const isCompleted = exp.status === 'completed';
      const expTotalAmount = exp.total_amount || exp.amount || 0;

      if (isSettlement) {
        totalSet = safeAdd(totalSet, exp.amount || 0);
      } else {
        totalExp = safeAdd(totalExp, expTotalAmount);
      }

      // Credit the payer for the total paid amount
      if (balances[exp.paid_by_uid]) {
        balances[exp.paid_by_uid].totalPaid = safeAdd(balances[exp.paid_by_uid].totalPaid, expTotalAmount);
        
        // Payer starts with the full expense amount as positive credit (unless settlement)
        if (!isCompleted) {
          balances[exp.paid_by_uid].netAmount = safeAdd(balances[exp.paid_by_uid].netAmount, expTotalAmount);
        }
      }

      // Distribute shares and deduct from borrower net balances
      exp.participants?.forEach(p => {
        if (!balances[p.uid]) return;

        const isShareCompleted = p.status === 'completed' || isCompleted;

        if (p.uid === exp.paid_by_uid) {
          // Payer's own share: they always owe themselves their own share
          balances[p.uid].netAmount = safeSubtract(balances[p.uid].netAmount, p.amount || 0);
        } else {
          // Borrower
          balances[p.uid].totalOwes = safeAdd(balances[p.uid].totalOwes, p.amount || 0);
          if (p.status === 'pending_settlement') {
            balances[p.uid].hasPendingSettlement = true;
          }

          if (!isShareCompleted) {
            // Borrower still owes this share: deduct from their net balance
            balances[p.uid].netAmount = safeSubtract(balances[p.uid].netAmount, p.amount || 0);
          } else {
            // Borrower settled their share:
            // Since they settled it, they don't owe it (so no deduction from borrower's netAmount).
            // But the payer already received it, so it's no longer outstanding for the payer.
            // Deduct it from the payer's netAmount!
            if (balances[exp.paid_by_uid] && !isCompleted) {
              balances[exp.paid_by_uid].netAmount = safeSubtract(balances[exp.paid_by_uid].netAmount, p.amount || 0);
            }
          }
        }
      });
    });

    // Simplify debts (greedy algorithm)
    const debtors = [];
    const creditors = [];

    Object.entries(balances).forEach(([uid, b]) => {
      if (b.netAmount > 0.01) creditors.push({ uid, name: b.name, amount: b.netAmount });
      else if (b.netAmount < -0.01) debtors.push({ uid, name: b.name, amount: Math.abs(b.netAmount) });
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const debts = [];
    let d = 0;
    let c = 0;

    while (d < debtors.length && c < creditors.length) {
      const debtor = debtors[d];
      const creditor = creditors[c];
      
      const amount = Math.min(debtor.amount, creditor.amount);
      
      debts.push({
        from: debtor.name,
        to: creditor.name,
        amount: amount
      });

      debtor.amount = safeSubtract(debtor.amount, amount);
      creditor.amount = safeSubtract(creditor.amount, amount);

      if (debtor.amount < 0.01) d++;
      if (creditor.amount < 0.01) c++;
    }

    return { totalExpenses: totalExp, totalSettlements: totalSet, memberBalances: balances, simplifiedDebts: debts };
  }, [group, expenses]);


  if (loading) return <div className="flex h-[100dvh] items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div></div>;
  if (!group) return <div className="flex h-[100dvh] items-center justify-center bg-slate-50">Group not found.</div>;

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="flex items-center gap-3">
                <Link to="/groups" className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-slate-100">
                  <ArrowLeft size={16} className="text-slate-600" />
                </Link>
                <div className="flex items-center gap-2.5">
                   {group.photoURL ? (
                      <img src={group.photoURL} alt={group.name} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shrink-0">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                   )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">{group.name}</h1>
                      {(group.createdBy === user?.student_id?.toString() || group.createdBy === user?.id?.toString()) && (
                        <button 
                          onClick={() => setIsEditModalOpen(true)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title="Edit members"
                        >
                          <Edit3 size={15} />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-[12px] text-slate-500 font-bold">{group.members?.length || 0} Members</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsSplitModalOpen(true)}
                className="self-start sm:self-auto px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] sm:text-[13px] font-bold rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.15)] hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
              >
                <Plus size={14} strokeWidth={3} />
                Add Group Expense
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Receipt size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Group Expenses</p>
                  <p className="text-sm sm:text-lg font-black text-slate-900 mt-0.5 truncate">{totalExpenses.toFixed(2)} <span className="text-[10px] sm:text-xs text-slate-400 font-bold">DH</span></p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Settlements</p>
                  <p className="text-sm sm:text-lg font-black text-slate-900 mt-0.5 truncate">{totalSettlements.toFixed(2)} <span className="text-[10px] sm:text-xs text-slate-400 font-bold">DH</span></p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <GroupMembersGrid members={group.members} balances={memberBalances} />
              <GroupActivityFeed 
                expenses={expenses} 
                user={user}
                onDelete={async (expenseId) => {
                  if (!window.confirm('Are you sure you want to delete this expense? This will remove it for all group members.')) return;
                  await deleteDoc(doc(db, 'expenses', expenseId));
                }}
              />
            </div>

          </div>
        </main>
      </div>

      {isSplitModalOpen && (
        <SplitExpenseModal 
          isOpen={isSplitModalOpen}
          onClose={() => setIsSplitModalOpen(false)}
          preselectedGroupId={group.id}
          groupMembers={group.members}
        />
      )}

      {isEditModalOpen && (
        <EditGroupModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          group={group}
        />
      )}
    </div>
  );
}
