import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, FileText, AlignLeft, SplitSquareHorizontal, HandCoins, AlertCircle, Loader2, Users, Home, Check, CheckSquare } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc } from 'firebase/firestore';
import { useAuthStore } from '../../store/authStore';
import MemberSplitCard from './MemberSplitCard';
import { calculateSplit } from './SplitCalculator';
import RoomSplitCard from './RoomSplitCard';
import { ROOM_DATA } from '../../data/rooms';
import { safeRound, safeAdd, safeSubtract, safeSum, validateSplitTotals } from '../../lib/financialMath';

const ARABIC_TO_ENGLISH_NAMES = {
  "عبد الحسيب": "Abdul Haseeb",
  "سيد أنور أحمد": "Sayyid Anwar Ahmad",
  "سيد حسين علي": "Sayyid Hussain Ali",
  "محمد نجيب الدين": "Muhammad Najeebuddin",
  "غفران الحق أنصار الحق": "Ghufranul Haq Ansarul Haq",
  "أشرف ألفنة": "Alfina",
  "حسن أنشاد": "Hasan Anshad",
  "حسين محمد ذاكر": "Hussain Muhammad Zakir",
  "صافية جاسمن": "Safia Jasmin",
  "محمد سنان": "Muhammad Sinan",
  "خان راشد": "Khan Rashid",
  "كلرتكل الأمين": "Kalarikkal Al Ameen",
  "محمد مراس": "Muhammad Miras",
  "رمل أبو بكر": "Ramal Abu Bakr",
  "محمد نهال": "Muhammad Nihal",
  "فاطمة هبة": "Fatima Hiba",
  "مندودن حسنة": "Mundodan Hasna",
  "عبد المرشد": "Abdul Murshid",
  "أشرف": "Ashraf",
  "محمد رميس": "Muhammad Ramees",
  "أحمد فارس": "Ahmad Faris",
  "محمد سهيل فاركود": "Muhammad Suhail Varkkod",
  "محمد جاسم فرمبن": "Muhammad Jassim Paramban",
  "محمد هرشاد": "Muhammad Harshad",
  "صالح فوتافرمبت": "Salih Pootaparambil",
  "محمد رئيس": "Muhammad Raees",
  "جوهر رزا": "Jauhar Raza",
  "مشاهد رزا": "Mushahid Raza",
  "فاطمة رشاء": "Fatima Rasha",
  "نيرول أس كى": "Niroul S K",
  "عثمان نعمة الله تديل تشريا": "Usman Niamatullah Thekkil Cheriya",
  "محمد طيب": "Muhammad Tayyib",
  "محمد يس تودنكل": "Muhammad Yaseen Thodungil",
  "محمد منور": "Muhammad Munawwar",
  "محمد يونس": "Muhammad Younus",
  "محمد أجواد": "Muhammad Ajwad",
  "محمد شكير": "Muhammad Shakeer",
  "الأمين": "Al Ameen",
  "محمد مدلاج": "Muhammad Midlaj",
  "أحمد علي": "Ahmad Ali"
};

const formatName = (rawName) => {
  const englishName = ARABIC_TO_ENGLISH_NAMES[rawName] || rawName;
  return englishName
    .replace(/\bMuhammad\b/gi, 'Md.')
    .replace(/\bMohammed\b/gi, 'Md.')
    .replace(/\bMuhammed\b/gi, 'Md.');
};

const playCoinSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    
    // First high-pitched ding
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(3500, audioCtx.currentTime + 0.05); 
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);

    // Second slightly offset harmonic for that metallic "clink"
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(4500, audioCtx.currentTime + 0.02);
    
    gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.02);
    gain2.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(audioCtx.currentTime + 0.02);
    osc2.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

const MoneyRain = () => {
  const elements = Array.from({ length: 40 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[100] flex items-center justify-center bg-white/40 backdrop-blur-sm rounded-[2rem]">
      <motion.div 
        initial={{ scale: 0, rotate: -10 }} 
        animate={{ scale: 1, rotate: 0 }} 
        transition={{ type: "spring", damping: 12, stiffness: 200 }}
        className="relative z-50 bg-emerald-500 text-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3"
      >
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
          <Check size={32} strokeWidth={3} className="text-white" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Expense Split!</h2>
        <p className="text-emerald-50 font-medium text-center">Successfully recorded and distributed.</p>
      </motion.div>
      {elements.map((_, i) => {
        const isCoin = i % 2 === 0;
        const randomX = Math.random() * 100;
        const randomDelay = Math.random() * 0.4;
        const duration = 0.8 + Math.random() * 1.2;
        return (
          <motion.div
            key={i}
            initial={{ y: -100, x: `${randomX}%`, opacity: 0, rotate: 0 }}
            animate={{ y: '100vh', opacity: [0, 1, 1, 0], rotate: 360 + Math.random() * 360 }}
            transition={{ duration, delay: randomDelay, ease: "easeIn" }}
            className="absolute top-0 text-emerald-500 drop-shadow-md"
            style={{ left: `${randomX}%` }}
          >
            {isCoin ? (
              <div className="w-6 h-6 rounded-full bg-yellow-400 border-2 border-yellow-500 shadow-sm flex items-center justify-center text-yellow-700 font-bold text-[10px]">DH</div>
            ) : (
              <div className="w-10 h-6 bg-emerald-400 rounded-sm border border-emerald-500 shadow-sm flex items-center justify-center text-white font-bold text-[8px] opacity-90">DH</div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default function SplitExpenseModal({ isOpen, onClose, onExpenseAdded, preselectedGroupId, groupMembers }) {
  const user = useAuthStore((state) => state.user);
  
  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [splitMode, setSplitMode] = useState('equal'); // 'equal', 'custom', 'separate'
  const [splitType, setSplitType] = useState('individual'); // 'individual', 'room'
  const [groupId, setGroupId] = useState('');
  
  const [allProfiles, setAllProfiles] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingProfiles, setFetchingProfiles] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);

  // Fetch profiles when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchProfiles = async () => {
        setFetchingProfiles(true);
        try {
          const q = query(collection(db, 'profiles'), orderBy('student_id', 'asc'));
          const querySnapshot = await getDocs(q);
          const profilesData = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
          setAllProfiles(profilesData);

          if (!preselectedGroupId && user) {
            const gQ = query(collection(db, 'groups'), where('memberUids', 'array-contains', user.student_id?.toString()));
            const gSnap = await getDocs(gQ);
            setUserGroups(gSnap.docs.map(doc => ({id: doc.id, ...doc.data()})));
          }
        } catch (err) {
          console.error(err);
          setError('Failed to load members or groups.');
        } finally {
          setFetchingProfiles(false);
        }
      };
      
      fetchProfiles();
      // Reset form
      setTotalAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setSplitMode('equal');
      setSplitType('individual');
      setGroupId(preselectedGroupId || '');
      setError('');
      setShowSuccessAnim(false);
    }
  }, [isOpen, preselectedGroupId, user]);

  // Re-map participants whenever splitType or allProfiles changes
  useEffect(() => {
    if (allProfiles.length === 0) return;

    if (splitType === 'individual') {
        const loggedInStudentId = parseInt(user?.student_id);
        const GIRL_IDS = [6, 9, 16, 17, 29];
        const ALLOWED_BOY_IDS = [4, 18, 34];

        if (groupId || preselectedGroupId) {
          const activeGroupId = groupId || preselectedGroupId;
          const targetGroup = preselectedGroupId ? { members: groupMembers } : userGroups.find(g => g.id === activeGroupId);
          if (targetGroup && targetGroup.members) {
            const initialParticipants = targetGroup.members.map(member => {
              const profile = allProfiles.find(p => p.id === member.uid);
              return {
                id: member.uid,
                student_id: profile ? parseInt(profile.student_id) : parseInt(member.uid),
                name: member.name,
                amount: 0,
                selected: true,
                isManuallyEdited: false,
                weight: 1,
                photoURL: profile ? (profile.photoURL || '') : ''
              };
            });
            setParticipants(initialParticipants);
            return;
          }
        }

        let filteredProfiles = allProfiles.filter(p => p.role !== 'room');

        if (GIRL_IDS.includes(loggedInStudentId)) {
          // Logged in as one of the 5 girls: show only the 5 girls
          filteredProfiles = filteredProfiles.filter(p => GIRL_IDS.includes(parseInt(p.student_id)));
        } else if (ALLOWED_BOY_IDS.includes(loggedInStudentId)) {
          // Logged in as one of the allowed boys: show everyone
          // No filtering needed
        } else {
          // Logged in as any other boy/account: exclude the 5 girls
          filteredProfiles = filteredProfiles.filter(p => !GIRL_IDS.includes(parseInt(p.student_id)));
        }

        const initialParticipants = filteredProfiles
          .map((profile, idx) => {
            const englishName = formatName(profile.name || '');
            return {
              id: profile.id,
              student_id: parseInt(profile.student_id) || (idx + 1),
              name: englishName,
              amount: 0,
              selected: profile.id === user?.id,
              isManuallyEdited: false,
              weight: 1,
              photoURL: profile.photoURL || ''
            };
          });
        setParticipants(initialParticipants);
    } else {
        // Room mode
        const initialParticipants = ROOM_DATA.map(room => {
            const roomProfile = allProfiles.find(p => p.role === 'room' && p.student_id === room.roomNo);
            return {
              id: `room-${room.roomNo}`,
              student_id: room.roomNo,
              name: `Room ${room.roomNo}`,
              amount: 0,
              selected: room.roomNo === user?.roomNo,
              isManuallyEdited: false,
              weight: room.members.length,
              roomMembers: room.members,
              leader: room.leader,
              photoURL: roomProfile ? (roomProfile.photoURL || '') : ''
            };
        });
        setParticipants(initialParticipants);
    }
  }, [splitType, allProfiles, user, groupId, userGroups, preselectedGroupId, groupMembers]);

  // Recalculate splits when Total Amount, Split Mode, or Selections change
  useEffect(() => {
    if (participants.length > 0) {
      setParticipants(prev => calculateSplit(totalAmount, prev, splitMode));
    }
  }, [totalAmount, splitMode]);

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      return a.student_id - b.student_id;
    });
  }, [participants]);

  const handleSelectToggle = (id) => {
    setParticipants(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, selected: !p.selected, isManuallyEdited: false } : p);
      return calculateSplit(totalAmount, updated, splitMode);
    });
  };

  const handleAmountChange = (id, amountStr) => {
    // If they manually type an amount, switch to custom mode if equal
    if (splitMode === 'equal') {
      setSplitMode('custom');
    }
    setParticipants(prev => calculateSplit(totalAmount, prev, splitMode, id, amountStr));
  };

  const areAllSelected = useMemo(() => {
    return participants.length > 0 && participants.every(p => p.selected);
  }, [participants]);

  const handleToggleSelectAll = () => {
    setParticipants(prev => {
      const targetSelectedState = !areAllSelected;
      const updated = prev.map(p => ({
        ...p,
        selected: targetSelectedState,
        isManuallyEdited: false
      }));
      return calculateSplit(totalAmount, updated, splitMode);
    });
  };

  const { totalAssigned, remainingAmount } = useMemo(() => {
    const assigned = safeSum(participants.map(p => p.amount || 0));
    const total = safeRound(totalAmount) || 0;
    return {
       totalAssigned: assigned,
       remainingAmount: safeSubtract(total, assigned)
     };
   }, [participants, totalAmount]);
 
   const isValid = useMemo(() => {
     const hasSelected = participants.some(p => p.selected && (p.amount || 0) > 0);
     if (!hasSelected) return false;
     
     const effectiveTotal = splitMode === 'separate' ? totalAssigned : safeRound(totalAmount) || 0;
     if (effectiveTotal <= 0 && splitMode === 'equal') return false;
 
     return true;
   }, [totalAmount, participants, splitMode, totalAssigned]);
 
   const handleSubmit = async (e) => {
     e.preventDefault();
     if (!isValid) return;

     let finalTotal = safeRound(totalAmount) || 0;

     if (splitMode === 'custom' && Math.abs(finalTotal - totalAssigned) > 0.005) {
        const confirmMsg = `The entered total is ${finalTotal.toFixed(2)} DH, but the custom splits sum to ${totalAssigned.toFixed(2)} DH.\n\nDo you want to automatically update the total to ${totalAssigned.toFixed(2)} DH and save?`;
        if (window.confirm(confirmMsg)) {
            setTotalAmount(totalAssigned.toFixed(2));
            finalTotal = totalAssigned;
        } else {
            return; 
        }
     }
 
     setLoading(true);
     setError('');
 
     try {
       const activeParticipants = participants.filter(p => p.selected && (p.amount || 0) > 0);
       let finalDbParticipants = [];

       if (splitType === 'room') {
          activeParticipants.forEach(room => {
             const roomAmount = safeRound(room.amount);
             const memberCount = room.roomMembers.length;
             if (memberCount === 0) return;
             
             const baseMemberShare = safeRound(roomAmount / memberCount);
             const memberShares = room.roomMembers.map(() => baseMemberShare);
             const assignedRoomTotal = memberShares.reduce((sum, s) => safeAdd(sum, s), 0);
             const roomRemainder = safeSubtract(roomAmount, assignedRoomTotal);
             if (roomRemainder !== 0 && memberShares.length > 0) {
                memberShares[0] = safeAdd(memberShares[0], roomRemainder);
             }

             room.roomMembers.forEach((rawMemberName, idx) => {
                const englishName = formatName(rawMemberName);
                const profile = allProfiles.find(p => formatName(p.name || '') === englishName);
                finalDbParticipants.push({
                  uid: profile ? profile.id : `unknown-${englishName}`,
                  name: englishName,
                  amount: memberShares[idx]
                });
             });
          });
       } else {
          finalDbParticipants = activeParticipants.map(p => ({
            uid: p.id,
            name: p.name,
            amount: safeRound(p.amount)
          }));
       }
 
       const newExpense = {
         total_amount: splitMode === 'separate' ? totalAssigned : finalTotal,
         paid_by_uid: (groupId || preselectedGroupId) ? user.student_id?.toString() : user.id,
         paid_by_name: formatName(user.name || 'Anonymous'),
         split_mode: splitMode,
         split_type: splitType,
         description: description.trim() || 'Shared Expense',
         notes: notes.trim(),
         date: date,
         participants: finalDbParticipants
       };

       if (groupId) {
         newExpense.groupId = groupId;
       }
 
       // Run absolute math pre-save check
       const validation = validateSplitTotals(newExpense.total_amount, newExpense.participants);
       if (!validation.isValid) {
         throw new Error(`Mathematical Validation Mismatch!\nThe sum of splits (${validation.actualTotal.toFixed(2)} DH) does not match total expense (${validation.expectedTotal.toFixed(2)} DH).\nDiscrepancy: ${validation.diff.toFixed(2)} DH.\n\nPlease balance calculations.`);
       }

       newExpense.created_at = new Date().toISOString();
       await addDoc(collection(db, 'expenses'), newExpense);
 
       setShowSuccessAnim(true);
       playCoinSound();
       setTimeout(() => {
         if (onExpenseAdded) onExpenseAdded();
         onClose();
         setShowSuccessAnim(false);
       }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to add expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 flex flex-col border border-white/20"
          >
            {showSuccessAnim && <MoneyRain />}
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm border border-blue-200">
                  <SplitSquareHorizontal size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Split an Expense</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Distribute costs equally or manually</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-all hover:rotate-90"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Type Toggle & Group Selector */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                {user?.role === 'room' && (
                  <div className="flex bg-slate-100/80 p-1 rounded-xl flex-1">
                    <button
                      type="button"
                      onClick={() => setSplitType('individual')}
                      className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                        splitType === 'individual' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                    >
                      <Users size={14} /> Individual Split
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitType('room')}
                      className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                        splitType === 'room' ? 'bg-white text-[#0088cc] shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                      }`}
                    >
                      <Home size={14} /> Room-Wise Split
                    </button>
                  </div>
                )}
                
                {/* Group Selector */}
                {!preselectedGroupId && splitType === 'individual' && userGroups.length > 0 && (
                  <div className="flex-1">
                    <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5">Link to Group (Optional)</label>
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-slate-800 font-bold text-[12px]"
                    >
                      <option value="">No Group (Global)</option>
                      {userGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Expense Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative group md:col-span-2">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5">Total Amount (MAD)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-400 font-bold text-lg">DH</span>
                    <input
                      type="number"
                      step={splitMode === 'separate' ? "0.01" : "1"}
                      min="0"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      disabled={splitMode === 'separate'}
                      className={`w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-slate-900 font-black text-xl placeholder-slate-300 ${
                        splitMode === 'separate' ? 'opacity-70 bg-slate-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
 
                <div className="relative group">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5">Description</label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={13} />
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-100 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none text-slate-800 font-medium placeholder-slate-300 text-[11px]"
                      placeholder="e.g. Dinner, Taxi, Groceries"
                      required
                    />
                  </div>
                </div>
 
                <div className="relative group">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5">Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={13} />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-100 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none text-slate-800 font-medium placeholder-slate-300 text-[11px]"
                      required
                    />
                  </div>
                </div>
 
                <div className="relative group col-span-1 md:col-span-2">
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 ml-0.5">Notes (Optional)</label>
                  <div className="relative">
                    <AlignLeft className="absolute left-3.5 top-3 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={13} />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-100 rounded-lg focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none text-slate-800 font-medium placeholder-slate-300 text-[11px] min-h-[55px] resize-none"
                      placeholder="Any extra details..."
                    />
                  </div>
                </div>
              </div>
 
              <div className="h-px bg-slate-100 w-full" />
 
              {/* Split Mode Tabs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Split Options</h4>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1 bg-slate-200/40 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSplitMode('equal')}
                    className={`py-1.5 px-3 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                      splitMode === 'equal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <SplitSquareHorizontal size={13} /> Equal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('custom')}
                    className={`py-1.5 px-3 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                      splitMode === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <HandCoins size={13} /> Custom
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('separate')}
                    className={`col-span-2 md:col-span-1 py-1.5 px-3 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                      splitMode === 'separate' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Separate
                  </button>
                </div>
                
                {splitMode === 'separate' && (
                  <p className="text-[10px] text-orange-600 bg-orange-50 p-2 rounded-lg font-medium border border-orange-100 flex items-center gap-1.5">
                    <AlertCircle size={13} /> Individual mode: Auto-splitting is disabled. Enter specific amounts manually.
                  </p>
                )}
              </div>

              {/* Members List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                      {splitType === 'room' ? 'Select Rooms' : 'Select Members'}
                  </h4>
                  {!fetchingProfiles && participants.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="px-2 py-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 rounded-md transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <CheckSquare size={11} strokeWidth={2.5} />
                      {areAllSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                {fetchingProfiles ? (
                  <div className="flex justify-center p-6">
                    <Loader2 className="animate-spin text-blue-500" size={20} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {sortedParticipants.map((member) => {
                      const isRoomId = member.id?.toString().startsWith('room-');
                      if (splitType === 'room' && !isRoomId) return null;
                      if (splitType === 'individual' && isRoomId) return null;

                      return splitType === 'room' ? (
                        <RoomSplitCard 
                          key={member.id}
                          room={{ 
                            id: member.id,
                            roomNo: member.student_id, 
                            leader: member.leader, 
                            members: member.roomMembers,
                            isManuallyEdited: member.isManuallyEdited
                          }}
                          isSelected={member.selected}
                          onSelectToggle={handleSelectToggle}
                          assignedAmount={member.amount}
                          perPersonAmount={member.weight > 0 ? member.amount / member.weight : 0}
                          splitMode={splitMode}
                          onAmountChange={handleAmountChange}
                        />
                      ) : (
                        <MemberSplitCard 
                          key={member.id}
                          member={member}
                          onSelectToggle={handleSelectToggle}
                          onAmountChange={handleAmountChange}
                          splitMode={splitMode}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
 
            {/* Sticky Summary Footer */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              {error && (
                <div className="mb-3 p-2 bg-red-50 text-red-600 text-[10px] font-medium rounded-lg flex items-center gap-1.5 border border-red-100">
                  <AlertCircle size={13} /> {error}
                </div>
              )}
 
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex gap-4.5 w-full sm:w-auto">
                  <div>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Total</p>
                    <p className="text-xs font-semibold text-slate-700">{parseFloat(totalAmount || 0).toFixed(2)} DH</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Assigned</p>
                    <p className="text-xs font-semibold text-slate-700">{totalAssigned.toFixed(2)} DH</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Remaining</p>
                    <p className={`text-xs font-semibold ${
                      Math.abs(remainingAmount) <= 0.05 ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {remainingAmount.toFixed(2)} DH
                    </p>
                  </div>
                </div>
 
                <button
                  onClick={handleSubmit}
                  disabled={loading || !isValid}
                  className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-black text-white text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : 'Save Expense'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
