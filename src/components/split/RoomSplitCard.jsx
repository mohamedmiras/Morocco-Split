import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Users, UserCircle, Home } from 'lucide-react';

export default function RoomSplitCard({ room, isSelected, onSelectToggle, assignedAmount = 0, perPersonAmount = 0, splitMode, onAmountChange }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col p-3 rounded-xl border transition-all duration-300 ${
        isSelected 
          ? 'bg-blue-50/50 border-blue-200 shadow-[0_4px_12px_rgba(37,99,235,0.06)]' 
          : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between cursor-pointer" onClick={() => onSelectToggle(room.id)}>
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
              isSelected 
                ? 'bg-blue-500 border-blue-500 text-white shadow-sm' 
                : 'bg-slate-50 border-slate-200 text-transparent'
            }`}
          >
            <Check size={12} strokeWidth={3} />
          </button>

          {/* Room Photo Avatar */}
          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            {room.photoURL ? (
              <img src={room.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <Home size={14} className="text-slate-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-[13px] font-bold text-slate-800">Room {room?.roomNo}</h4>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 tracking-wider uppercase flex items-center gap-1">
                <Users size={10} /> {(room?.members || []).length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
              <UserCircle size={12} className="text-slate-400" /> {room?.leader || 'Leader'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Amount Input */}
          <div className="relative w-20 sm:w-24 shrink-0">
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={!isSelected && splitMode !== 'separate'}
              value={assignedAmount === 0 ? '' : (room?.isManuallyEdited ? assignedAmount : Number(assignedAmount).toFixed(2))}
              onChange={(e) => onAmountChange(room?.id, e.target.value)}
              placeholder="0.00"
              className={`w-full px-2 py-1.5 rounded-lg border text-right font-medium text-[11px] sm:text-[12px] outline-none transition-all ${
                isSelected
                  ? 'bg-white border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-900 shadow-sm'
                  : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            />
          </div>
          
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={`p-1.5 rounded-md transition-colors ${isExpanded ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
          >
            <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-3 border-t border-slate-100/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Room Members</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {(room?.members || []).map((member, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100/50">
                    <div className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <span className="text-slate-500 text-[9px] font-bold">{member?.charAt(0) || ''}</span>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-600 truncate">{member}</p>
                    {isSelected && (
                      <span className="ml-auto text-[9px] font-bold text-slate-400">{perPersonAmount.toFixed(2)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
