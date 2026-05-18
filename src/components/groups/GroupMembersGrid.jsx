import { motion } from 'framer-motion';

export default function GroupMembersGrid({ members, balances }) {
  if (!members || !balances) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-[12px] font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
          Group Members
        </h3>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-md">{members.length}</span>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {members.map(member => {
          const b = balances[member.uid] || { totalPaid: 0, totalOwes: 0, netAmount: 0 };
          return (
            <div key={member.uid} className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0 border border-indigo-100">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-xs leading-tight truncate flex items-center gap-1.5">
                  {member.name}
                  {b.hasPendingSettlement && (
                    <span className="shrink-0 px-1 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[8px] font-extrabold tracking-wide uppercase">
                      Pending
                    </span>
                  )}
                </p>
                <p className="text-[10px] font-medium mt-1">
                  {b.netAmount > 0.01 ? (
                    <span className="text-emerald-600 font-semibold">Owed: {b.netAmount.toFixed(2)} DH</span>
                  ) : b.netAmount < -0.01 ? (
                    <span className="text-red-500 font-semibold">Owes: {Math.abs(b.netAmount).toFixed(2)} DH</span>
                  ) : (
                    <span className="text-slate-400 font-medium">Settled Up</span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                  b.netAmount > 0.01 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                  b.netAmount < -0.01 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100 text-slate-500'
                }`}>
                  {b.netAmount > 0.01 ? '+' : ''}{b.netAmount.toFixed(0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
