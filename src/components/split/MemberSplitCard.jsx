import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MemberSplitCard({ member, onSelectToggle, onAmountChange, splitMode }) {
  const isSeparate = splitMode === 'separate';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ order: member.selected ? member.student_id : 1000 + member.student_id }}
      className={`flex items-center justify-between p-2.5 rounded-[0.75rem] border transition-colors duration-200 ${
        member.selected 
          ? 'bg-blue-50/50 border-blue-100 shadow-sm' 
          : 'bg-white border-slate-50 opacity-70 hover:opacity-100'
      }`}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {/* Selection Toggle */}
        <button 
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onSelectToggle(member.id);
          }}
          className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all shrink-0 ${
            member.selected 
              ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/20' 
              : 'bg-white border-slate-200 text-transparent hover:border-blue-300'
          }`}
        >
          <Check size={12} strokeWidth={2.5} />
        </button>
 
        {/* Avatar & Name */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            {member.photoURL ? (
              <img src={member.photoURL} alt="" className="w-full h-full object-cover animate-fade-in" />
            ) : (
              <span className="text-slate-500 text-[10px] font-medium">
                {member.student_id}
              </span>
            )}
          </div>
          <div className="truncate min-w-0">
            <p className="text-[11px] font-medium text-slate-700 truncate">{member.name}</p>
            {member.isManuallyEdited && !isSeparate && (
              <span className="text-[8px] font-medium text-orange-500 uppercase tracking-wider block mt-0.5">Custom Locked</span>
            )}
          </div>
        </div>
      </div>
 
      {/* Amount Input */}
      <div className="relative w-20 shrink-0 ml-2">
        <input
          type="number"
          step="0.01"
          min="0"
          disabled={!member.selected && !isSeparate}
          value={member.amount === 0 ? '' : Number(member.amount).toString()}
          onChange={(e) => onAmountChange(member.id, e.target.value)}
          placeholder="0.00"
          className={`w-full px-2.5 py-1.5 rounded-lg border text-right font-medium text-[11px] outline-none transition-all ${
            member.selected
              ? 'bg-white border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-900'
              : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        />
      </div>
    </motion.div>
  );
}
