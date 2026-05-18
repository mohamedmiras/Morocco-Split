import { motion } from 'framer-motion';
import { Receipt, CheckCircle2, User, Users } from 'lucide-react';

export default function GroupActivityFeed({ expenses }) {
  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown Date';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
    } catch {
      return isoString;
    }
  };

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
                <div key={exp.id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                    <Icon size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {exp.description || 'Shared Expense'}
                      </p>
                      <p className="text-sm font-black text-slate-900 whitespace-nowrap">
                        {parseFloat(exp.total_amount || exp.amount || 0).toFixed(2)} DH
                      </p>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
