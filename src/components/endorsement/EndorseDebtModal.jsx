import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRightLeft, UserMinus, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';

export default function EndorseDebtModal({ isOpen, onClose, oweDetails, owedDetails, onEndorseRequested }) {
  const user = useAuthStore((state) => state.user);
  const [selectedDebtor, setSelectedDebtor] = useState(null); // User A (who owes me)
  const [selectedCreditor, setSelectedCreditor] = useState(null); // User C (who I owe)
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingOutgoing, setPendingOutgoing] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'endorsements'),
      where('status', '==', 'pending_c'),
      where('initiatedBy', '==', user?.id?.toString())
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const reqs = [];
      snapshot.forEach(doc => reqs.push({ id: doc.id, ...doc.data() }));
      setPendingOutgoing(reqs);
    });
    return () => unsub();
  }, [user]);

  // Derive real amounts by deducting pending transfers
  const getRealDebtorAmount = (debtor) => {
    if (!debtor) return 0;
    const pendingSum = pendingOutgoing
      .filter(r => r.fromDebtorUid === debtor.uid)
      .reduce((sum, r) => sum + r.amount, 0);
    return Math.max(0, debtor.amount - pendingSum);
  };

  const getRealCreditorAmount = (creditor) => {
    if (!creditor) return 0;
    const pendingSum = pendingOutgoing
      .filter(r => r.newCreditorUid === creditor.uid)
      .reduce((sum, r) => sum + r.amount, 0);
    return Math.max(0, creditor.amount - pendingSum);
  };

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedDebtor(null);
      setSelectedCreditor(null);
      setAmount('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const realDebtorAmount = getRealDebtorAmount(selectedDebtor);
  const realCreditorAmount = getRealCreditorAmount(selectedCreditor);

  const maxAllowed = (selectedDebtor && selectedCreditor) 
    ? Math.min(realDebtorAmount, realCreditorAmount) 
    : 0;

  // When debtor/creditor changes, pre-fill amount if both selected
  useEffect(() => {
    if (selectedDebtor && selectedCreditor) {
      setAmount(maxAllowed.toFixed(2));
    }
  }, [selectedDebtor, selectedCreditor, pendingOutgoing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedDebtor || !selectedCreditor) {
      setError('Please select both a debtor and a creditor.');
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    if (transferAmount > maxAllowed + 0.01) { // 0.01 safety margin
      setError(`Amount exceeds the maximum transferable limit of ${maxAllowed.toFixed(2)} DH.`);
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'endorsements'), {
        fromDebtorUid: selectedDebtor.uid,
        fromDebtorName: selectedDebtor.name,
        oldCreditorUid: user.id,
        oldCreditorName: user.name,
        newCreditorUid: selectedCreditor.uid,
        newCreditorName: selectedCreditor.name,
        amount: transferAmount,
        status: 'pending_c', // Waiting for C to accept
        initiatedBy: user.id,
        createdAt: serverTimestamp(),
        acceptedAt: null
      });

      if (onEndorseRequested) onEndorseRequested();
      onClose();
    } catch (err) {
      console.error('Failed to initiate endorsement:', err);
      setError('Network error. Failed to initiate debt endorsement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSubmitting ? onClose : undefined}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <ArrowRightLeft size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 tracking-tight">Endorse Debt</h2>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Hawala Transfer</p>
                </div>
              </div>
              <button
                onClick={!isSubmitting ? onClose : undefined}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors outline-none"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="mb-6 bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                <h3 className="text-[11px] font-black uppercase text-blue-800 tracking-wider mb-1 flex items-center gap-1.5">
                  <AlertCircle size={14} /> How it works
                </h3>
                <p className="text-xs text-blue-900/70 font-medium leading-relaxed">
                  Transfer a debt owed to you, to someone you owe money to. This will reduce both balances simultaneously, acting as a direct assignment of the debt.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Debtor Selection (Who owes me) */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                    <UserMinus size={14} /> Step 1: Transfer Debt From
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {owedDetails.filter(d => getRealDebtorAmount(d) > 0.005).length === 0 ? (
                      <p className="text-xs text-slate-400 italic col-span-full py-2">Nobody owes you money currently.</p>
                    ) : (
                      owedDetails.filter(d => getRealDebtorAmount(d) > 0.005).map(debtor => (
                        <div 
                          key={debtor.uid}
                          onClick={() => setSelectedDebtor(debtor)}
                          className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center ${
                            selectedDebtor?.uid === debtor.uid 
                              ? 'border-indigo-500 bg-indigo-50 shadow-[0_4px_12px_rgba(99,102,241,0.15)]' 
                              : 'border-slate-100 hover:border-slate-200 bg-white'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{debtor.name}</p>
                            <p className="text-[10px] font-black text-emerald-500 mt-0.5">Owes you {getRealDebtorAmount(debtor).toFixed(2)}</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedDebtor?.uid === debtor.uid ? 'border-indigo-500' : 'border-slate-200'}`}>
                            {selectedDebtor?.uid === debtor.uid && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Creditor Selection (Who I owe) */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                    <UserPlus size={14} /> Step 2: Transfer Debt To
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {oweDetails.filter(c => getRealCreditorAmount(c) > 0.005).length === 0 ? (
                      <p className="text-xs text-slate-400 italic col-span-full py-2">You don't owe anyone money currently.</p>
                    ) : (
                      oweDetails.filter(c => getRealCreditorAmount(c) > 0.005).map(creditor => (
                        <div 
                          key={creditor.uid}
                          onClick={() => setSelectedCreditor(creditor)}
                          className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex justify-between items-center ${
                            selectedCreditor?.uid === creditor.uid 
                              ? 'border-indigo-500 bg-indigo-50 shadow-[0_4px_12px_rgba(99,102,241,0.15)]' 
                              : 'border-slate-100 hover:border-slate-200 bg-white'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{creditor.name}</p>
                            <p className="text-[10px] font-black text-rose-500 mt-0.5">You owe {getRealCreditorAmount(creditor).toFixed(2)}</p>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedCreditor?.uid === creditor.uid ? 'border-indigo-500' : 'border-slate-200'}`}>
                            {selectedCreditor?.uid === creditor.uid && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Amount */}
                {selectedDebtor && selectedCreditor && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-2">
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Step 3: Endorsement Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={maxAllowed}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-4 text-slate-800 font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all pr-16"
                        placeholder="0.00"
                        required
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">DH</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-400">Max Transferable: {maxAllowed.toFixed(2)} DH</span>
                      <button type="button" onClick={() => setAmount(maxAllowed.toFixed(2))} className="text-indigo-600 hover:text-indigo-700">MAX</button>
                    </div>
                  </motion.div>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold">
                    <AlertCircle size={14} />
                    {error}
                  </motion.div>
                )}

                {/* Summary View */}
                {selectedDebtor && selectedCreditor && amount && !error && (
                  <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl text-center space-y-2">
                    <p className="text-xs font-medium text-slate-600">
                      <span className="font-bold text-slate-800">{selectedDebtor.name}</span> will now owe <span className="font-bold text-slate-800">{selectedCreditor.name}</span> directly.
                    </p>
                    <p className="text-[10px] text-slate-500">
                      This reduces your debt to {selectedCreditor.name} by <span className="font-bold text-slate-700">{amount} DH</span>.
                    </p>
                  </div>
                )}

              </form>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-white">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedDebtor || !selectedCreditor || !amount}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black rounded-xl shadow-[0_4px_12px_rgba(79,70,229,0.2)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Requesting Endorsement...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft size={16} strokeWidth={2.5} />
                    Submit Endorsement Request
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
