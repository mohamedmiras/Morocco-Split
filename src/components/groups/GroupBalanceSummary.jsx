import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function GroupBalanceSummary({ simplifiedDebts }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden sticky top-6">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider">
          Simplified Debts
        </h3>
        <p className="text-[11px] text-slate-500 mt-1 font-medium">Who owes who in this group</p>
      </div>
      <div className="p-0">
        {simplifiedDebts.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm font-bold text-slate-400">All settled up!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {simplifiedDebts.map((debt, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                    {debt.from.charAt(0).toUpperCase()}
                  </div>
                  <ArrowRight size={14} className="text-slate-300" />
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                    {debt.to.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">{debt.from.split(' ')[0]} owes</p>
                  <p className="text-sm font-black text-slate-800">{debt.amount.toFixed(2)} DH</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
