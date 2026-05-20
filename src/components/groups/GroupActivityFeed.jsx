import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt, CheckCircle2, User, Users, ChevronDown, Check, Trash2, Loader2 } from 'lucide-react';

export default function GroupActivityFeed({ expenses, user, onDelete }) {
  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown Date';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
    } catch {
      return isoString;
    }
  };

  const [expandedTxId, setExpandedTxId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">
          Recent Activity
        </h3>
      </div>
      <div className="p-0">
        {expenses.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-bold text-slate-500">No activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {expenses.map((exp) => {
              const isSettlement = exp.category === 'settlement' || exp.category === 'transfer';
              const Icon = isSettlement ? CheckCircle2 : Receipt;
              const iconColor = isSettlement ? 'text-emerald-500 bg-emerald-50' : 'text-blue-500 bg-blue-50';

              return (
                <div key={exp.id} onClick={() => setExpandedTxId(expandedTxId === exp.id ? null : exp.id)} className="p-4 sm:p-5 flex flex-col gap-2 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50 last:border-0 group">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                      <Icon size={20} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {exp.description || 'Shared Expense'}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-sm font-black text-slate-900 whitespace-nowrap">
                            {parseFloat(exp.total_amount || exp.amount || 0).toFixed(2)} DH
                          </p>
                          <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedTxId === exp.id ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                          <User size={12} /> {exp.paid_by_name} paid
                        </p>
                        <span className="text-slate-300">•</span>
                        <p className="text-[11px] font-medium text-slate-500">
                          {formatDate(exp.created_at || exp.createdAt || exp.date)}
                        </p>
                      </div>
                      {exp.participants?.length > 0 && !isSettlement && (
                        <p className="text-[10px] font-semibold text-slate-400 mt-2 flex items-center gap-1 bg-slate-100 w-fit px-2 py-0.5 rounded-md">
                          <Users size={10} /> Split among {exp.participants.length}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                      {expandedTxId === exp.id && exp.participants && !isSettlement && (
                          <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden mt-2 pt-2 border-t border-slate-100 pl-14"
                          >
                              <div className="bg-slate-50 rounded-lg p-2 space-y-1">
                                  {exp.participants.map((p, i) => {
                                      const isPayer = p.uid === exp.paid_by_uid;
                                      const isParticipantPaid = isPayer || p.status === 'completed' || exp.status === 'completed';
                                      return (
                                      <div key={i} className="flex items-center justify-between text-[11px]">
                                          <span className="font-medium text-slate-600">{p.name}</span>
                                          <div className="flex items-center gap-2">
                                              <span className="font-bold text-slate-700">{parseFloat(p.amount).toFixed(2)} DH</span>
                                              {isParticipantPaid ? (
                                                  <span className="text-emerald-500 flex items-center gap-0.5"><Check size={10} /> Paid</span>
                                              ) : (
                                                  <span className="text-orange-500">Pending</span>
                                              )}
                                          </div>
                                      </div>
                                      );
                                  })}
                              </div>
                          </motion.div>
                      )}
                  </AnimatePresence>

                  <AnimatePresence>
                      {expandedTxId === exp.id && onDelete && user && (exp.paid_by_uid === user.id || exp.paid_by_uid === user.student_id?.toString()) && (
                          <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden pl-14"
                          >
                              <div className="pt-2 flex justify-end">
                                  <button
                                      disabled={deletingId === exp.id}
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingId(exp.id);
                                          onDelete(exp.id).finally(() => setDeletingId(null));
                                      }}
                                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-lg border border-red-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                      {deletingId === exp.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                      Delete Expense
                                  </button>
                              </div>
                          </motion.div>
                      )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
