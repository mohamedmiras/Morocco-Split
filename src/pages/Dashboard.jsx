import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, User, FileText, Hash, Calendar, Edit3, Loader2, ChevronDown, Check, Home, Clock, Users, Camera, Trash2, ArrowRightLeft, Download } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import SettingsModal from '../components/SettingsModal';
import SplitExpenseModal from '../components/split/SplitExpenseModal';
import EndorseDebtModal from '../components/endorsement/EndorseDebtModal';
import ImageCropperModal from '../components/ImageCropperModal';
import { useAuthStore } from '../store/authStore';
import studentsData from '../data/students.json';
import { db } from '../lib/firebase';
import { collection, query, getDocs, orderBy, updateDoc, doc, setDoc, writeBatch, onSnapshot, where, deleteDoc } from 'firebase/firestore';
import { ROOM_DATA } from '../data/rooms';
import imageCompression from 'browser-image-compression';
import { safeRound, safeAdd, safeSubtract, safeSum } from '../lib/financialMath';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [isEndorseModalOpen, setIsEndorseModalOpen] = useState(false);
  const [pendingEndorsements, setPendingEndorsements] = useState([]);
  const [isEndorseActionLoading, setIsEndorseActionLoading] = useState(false);
  const [showAllIndividualTransactions, setShowAllIndividualTransactions] = useState(false);
  const [showAllRoomTransactions, setShowAllRoomTransactions] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("To install on iOS: tap the 'Share' button at the bottom of Safari, then select 'Add to Home Screen'.\n\nOn Android: tap the menu icon in Chrome and select 'Add to Home screen'.");
    }
  };

  const fetchExpenses = async () => {
    if (!user) return;
    setLoadingExpenses(true);
    try {
      const q = query(collection(db, 'expenses'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExpenses(fetched);
    } catch (err) {
      console.error("Error fetching expenses:", err);
    } finally {
      setLoadingExpenses(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'endorsements'),
      where('status', '==', 'pending_c'),
      where('newCreditorUid', '==', user?.id?.toString())
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const reqs = [];
      snapshot.forEach(doc => reqs.push({ id: doc.id, ...doc.data() }));
      setPendingEndorsements(reqs);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'groups'),
      where('memberUids', 'array-contains', user.student_id?.toString() || user.id?.toString())
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const fetched = [];
      snapshot.forEach(doc => fetched.push({ id: doc.id, ...doc.data() }));
      setGroups(fetched);
    });
    return () => unsub();
  }, [user]);

  const groupNameMap = useMemo(() => {
    const map = {};
    groups.forEach(g => {
      map[g.id] = g.name;
    });
    return map;
  }, [groups]);

  const formatDateToDMY = (dateStr) => {
    if (!dateStr || dateStr === 'Unknown Date') return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const monthMap = {
        '01': 'JAN', '02': 'FEB', '03': 'MAR', '04': 'APR',
        '05': 'MAY', '06': 'JUN', '07': 'JUL', '08': 'AUG',
        '09': 'SEP', '10': 'OCT', '11': 'NOV', '12': 'DEC'
      };
      const day = parts[2];
      const monthDigit = parts[1];
      const year = parts[0];
      const monthName = monthMap[monthDigit] || monthDigit;
      return `${day}-${monthName}-${year}`;
    }
    return dateStr;
  };

  const { individualStats, roomStats } = useMemo(() => {
    const emptyStats = { totalOwe: 0, totalOwed: 0, netBalance: 0, transactionsList: [], oweDetails: [], owedDetails: [], pendingIncoming: [], pendingOutgoing: [] };
    if (!user) return { individualStats: emptyStats, roomStats: emptyStats };

    const processExpenses = (targetSplitType) => {
        const txList = [];
        const balancesMap = {}; 
        const pendingIn = [];
        const pendingOut = [];

        let myRoom = null;
        if (user.role === 'room') {
            myRoom = ROOM_DATA.find(r => r.roomNo === user.roomNo);
        } else {
            myRoom = ROOM_DATA.find(r => r.members.some(m => m.toLowerCase() === (user.name || '').toLowerCase()));
        }
        const myRoomMemberNames = myRoom ? myRoom.members.map(m => m.toLowerCase()) : [];

        expenses.forEach(exp => {
          const currentSplitType = exp.split_type || 'individual';
          if (currentSplitType !== targetSplitType) return;

          const isDocCompleted = exp.status === 'completed';
          const isDocPending = exp.status === 'pending_settlement';

          let isPayer = false;
          if (targetSplitType === 'room') {
             isPayer = exp.paid_by_uid === user.id || exp.paid_by_uid === user.student_id?.toString() || (myRoom && exp.paid_by_uid === `room-${myRoom.roomNo}`) || myRoomMemberNames.includes((exp.paid_by_name || '').toLowerCase());
          } else {
             isPayer = exp.paid_by_uid === user.id || exp.paid_by_uid === user.student_id?.toString();
          }

          const desc = exp.description || 'Shared Expense';

          exp.participants?.forEach(p => {
            if (p.uid === exp.paid_by_uid) return; 
            if (!p.amount || p.amount <= 0) return;

            let isBorrower = false;
            if (targetSplitType === 'room') {
               isBorrower = p.uid === user.id || p.uid === user.student_id?.toString() || (myRoom && p.uid === `room-${myRoom.roomNo}`) || myRoomMemberNames.includes((p.name || '').toLowerCase());
            } else {
               isBorrower = p.uid === user.id || p.uid === user.student_id?.toString();
            }

            const isCompleted = p.status === 'completed' || isDocCompleted;
            const isPending = p.status === 'pending_settlement' || isDocPending;

            // Group by Room IDs and Room Names if target is a room-wise split
            let displayBorrowerUid = p.uid;
            let displayBorrowerName = p.name || 'Unknown User';
            let displayLenderUid = exp.paid_by_uid;
            let displayLenderName = exp.paid_by_name || 'Other User';

            if (targetSplitType === 'room') {
              const borrowerRoom = ROOM_DATA.find(r => r.members.some(m => m.toLowerCase() === (p.name || '').toLowerCase()));
              if (borrowerRoom) {
                displayBorrowerUid = `room-${borrowerRoom.roomNo}`;
                displayBorrowerName = `Room ${borrowerRoom.roomNo}`;
              }
              const lenderRoom = ROOM_DATA.find(r => 
                r.roomNo === exp.paid_by_name || 
                `room-${r.roomNo}` === exp.paid_by_uid || 
                r.members.some(m => m.toLowerCase() === (exp.paid_by_name || '').toLowerCase())
              );
              if (lenderRoom) {
                displayLenderUid = `room-${lenderRoom.roomNo}`;
                displayLenderName = `Room ${lenderRoom.roomNo}`;
              }
            }

            if (isPending && !isCompleted) {
              if (isPayer && !isBorrower) {
                pendingIn.push({ id: exp.id, borrower_uid: displayBorrowerUid, borrower_name: displayBorrowerName, amount: p.amount });
              } else if (!isPayer && isBorrower) {
                pendingOut.push({ id: exp.id, lender_uid: displayLenderUid, amount: p.amount });
              }
            }

            if (isPayer && !isBorrower) {
              txList.push({
                id: `${exp.id}-${displayBorrowerUid}`,
                description: desc,
                isGroup: !!exp.groupId,
                groupName: exp.groupId ? (groupNameMap[exp.groupId] || 'Group Expense') : null,
                amount: p.amount,
                type: 'owed',
                date: formatDateToDMY(exp.date) || 'Unknown Date',
                person: displayBorrowerName,
                notes: exp.notes || '',
                isSettled: isCompleted,
                originalExp: exp
              });
              if (!isCompleted) {
                if (!balancesMap[displayBorrowerUid]) balancesMap[displayBorrowerUid] = { name: displayBorrowerName, netAmount: 0 };
                balancesMap[displayBorrowerUid].netAmount = safeAdd(balancesMap[displayBorrowerUid].netAmount, p.amount);
              }
            } else if (!isPayer && isBorrower) {
              txList.push({
                id: `${exp.id}-${user.id}`,
                description: desc,
                isGroup: !!exp.groupId,
                groupName: exp.groupId ? (groupNameMap[exp.groupId] || 'Group Expense') : null,
                amount: p.amount,
                type: 'owe',
                date: formatDateToDMY(exp.date) || 'Unknown Date',
                person: displayLenderName,
                notes: exp.notes || '',
                isSettled: isCompleted,
                originalExp: exp
              });
              if (!isCompleted) {
                if (!balancesMap[displayLenderUid]) balancesMap[displayLenderUid] = { name: displayLenderName, netAmount: 0 };
                balancesMap[displayLenderUid].netAmount = safeSubtract(balancesMap[displayLenderUid].netAmount, p.amount);
              }
            }
          });
        });

        let finalOweSum = 0;
        let finalOwedSum = 0;
        const finalOweArr = [];
        const finalOwedArr = [];

        Object.entries(balancesMap).forEach(([uid, b]) => {
          if (b.netAmount > 0.005) {
            finalOwedSum = safeAdd(finalOwedSum, b.netAmount);
            finalOwedArr.push({ uid, name: b.name, amount: b.netAmount, desc: 'Net Outstanding Balance', date: '' });
          } else if (b.netAmount < -0.005) {
            const absAmount = Math.abs(b.netAmount);
            finalOweSum = safeAdd(finalOweSum, absAmount);
            finalOweArr.push({ uid, name: b.name, amount: absAmount, desc: 'Net Outstanding Balance', date: '' });
          }
        });

        // Group transactions by original expense ID to avoid duplicates
        const groupedTxMap = {};
        txList.forEach(tx => {
          const expId = tx.originalExp?.id || tx.id;
          if (!groupedTxMap[expId]) {
            groupedTxMap[expId] = { ...tx, id: expId, amount: 0, isSettled: true };
          }
          groupedTxMap[expId].amount = safeAdd(groupedTxMap[expId].amount, tx.amount);
          // Only mark as settled if ALL participant entries are settled
          if (!tx.isSettled) groupedTxMap[expId].isSettled = false;
        });
        const groupedTxList = Object.values(groupedTxMap);

        return {
          totalOwe: finalOweSum,
          totalOwed: finalOwedSum,
          netBalance: safeSubtract(finalOwedSum, finalOweSum),
          transactionsList: groupedTxList,
          oweDetails: finalOweArr,
          owedDetails: finalOwedArr,
          pendingIncoming: pendingIn,
          pendingOutgoing: pendingOut
        };
    };

    return {
        individualStats: processExpenses('individual'),
        roomStats: processExpenses('room')
    };
  }, [expenses, user, groupNameMap]);

  const auditLogs = useMemo(() => {
    return expenses.map(exp => {
      const expectedTotal = safeRound(exp.total_amount || 0);
      const actualTotal = safeSum((exp.participants || []).map(p => p.amount || 0));
      const diff = safeSubtract(expectedTotal, actualTotal);
      return {
        id: exp.id,
        description: exp.description || 'Shared Expense',
        expectedTotal,
        actualTotal,
        diff,
        isValid: Math.abs(diff) < 0.001,
        date: formatDateToDMY(exp.date) || 'Unknown Date',
      };
    });
  }, [expenses]);

  const globalInvariant = useMemo(() => {
    const systemBalances = {};
    expenses.forEach(exp => {
      const isDocCompleted = exp.status === 'completed';
      if (isDocCompleted) return;
      
      exp.participants?.forEach(p => {
        if (p.uid === exp.paid_by_uid) return;
        if (!p.amount || p.amount <= 0) return;
        if (p.status === 'completed') return;
        
        // Payer is owed
        if (!systemBalances[exp.paid_by_uid]) systemBalances[exp.paid_by_uid] = 0;
        systemBalances[exp.paid_by_uid] = safeAdd(systemBalances[exp.paid_by_uid], p.amount);
        
        // Borrower owes
        if (!systemBalances[p.uid]) systemBalances[p.uid] = 0;
        systemBalances[p.uid] = safeSubtract(systemBalances[p.uid], p.amount);
      });
    });
    
    const allUsersSum = Object.values(systemBalances).reduce((sum, val) => safeAdd(sum, val), 0);
    const totalTransactionsChecked = expenses.length;
    const totalDiscrepancies = auditLogs.filter(log => !log.isValid).length;
    
    return {
      allUsersSum,
      isLedgerBalanced: Math.abs(allUsersSum) < 0.01,
      totalTransactionsChecked,
      totalDiscrepancies,
      systemBalances
    };
  }, [expenses, auditLogs]);

  const handleAcceptEndorsement = async (endorsement) => {
    try {
      setIsEndorseActionLoading(true);
      const batch = writeBatch(db);

      const endRef = doc(db, 'endorsements', endorsement.id);
      batch.update(endRef, { status: 'completed', acceptedAt: new Date().toISOString() });

      const dateNow = new Date().toISOString();

      const exp1Ref = doc(collection(db, 'expenses'));
      batch.set(exp1Ref, {
        amount: endorsement.amount,
        total_amount: endorsement.amount,
        category: 'transfer',
        date: dateNow,
        created_at: dateNow,
        description: `Hawala Settlement: Cleared ${endorsement.fromDebtorName}'s debt to ${endorsement.oldCreditorName}`,
        paid_by_uid: endorsement.fromDebtorUid,
        paid_by_name: endorsement.fromDebtorName,
        participants: [{
          uid: endorsement.oldCreditorUid,
          name: endorsement.oldCreditorName,
          amount: endorsement.amount,
          status: 'pending'
        }],
        status: 'pending'
      });

      const exp2Ref = doc(collection(db, 'expenses'));
      batch.set(exp2Ref, {
        amount: endorsement.amount,
        total_amount: endorsement.amount,
        category: 'transfer',
        date: dateNow,
        created_at: dateNow,
        description: `Hawala Settlement: Cleared ${endorsement.oldCreditorName}'s debt to ${endorsement.newCreditorName}`,
        paid_by_uid: endorsement.oldCreditorUid,
        paid_by_name: endorsement.oldCreditorName,
        participants: [{
          uid: endorsement.newCreditorUid,
          name: endorsement.newCreditorName,
          amount: endorsement.amount,
          status: 'pending'
        }],
        status: 'pending'
      });

      const exp3Ref = doc(collection(db, 'expenses'));
      batch.set(exp3Ref, {
        amount: endorsement.amount,
        total_amount: endorsement.amount,
        category: 'transfer',
        date: dateNow,
        created_at: dateNow,
        description: `Debt Endorsement: ${endorsement.oldCreditorName} transferred ${endorsement.fromDebtorName}'s debt to you.`,
        paid_by_uid: endorsement.newCreditorUid,
        paid_by_name: endorsement.newCreditorName,
        participants: [{
          uid: endorsement.fromDebtorUid,
          name: endorsement.fromDebtorName,
          amount: endorsement.amount,
          status: 'pending'
        }],
        status: 'pending'
      });

      await batch.commit();
      fetchExpenses();
    } catch (err) {
      console.error(err);
      alert('Failed to accept endorsement.');
    } finally {
      setIsEndorseActionLoading(false);
    }
  };

  const handleRejectEndorsement = async (endorsementId) => {
    try {
      setIsEndorseActionLoading(true);
      await updateDoc(doc(db, 'endorsements', endorsementId), { status: 'rejected' });
    } catch (err) {
      console.error(err);
    } finally {
      setIsEndorseActionLoading(false);
    }
  };

  const handleIPaid = async (lenderUid) => {
    try {
      const isLenderRoom = lenderUid.toString().startsWith('room-');
      let lenderRoomNo = '';
      let lenderRoomMembers = [];
      if (isLenderRoom) {
        lenderRoomNo = lenderUid.replace('room-', '');
        const rData = ROOM_DATA.find(r => r.roomNo === lenderRoomNo);
        lenderRoomMembers = rData ? rData.members.map(m => m.toLowerCase()) : [];
      }

      let myRoom = null;
      if (user?.role === 'room') {
          myRoom = ROOM_DATA.find(r => r.roomNo === user.roomNo);
      } else if (user) {
          myRoom = ROOM_DATA.find(r => r.members.some(m => m.toLowerCase() === (user.name || '').toLowerCase()));
      }
      const myRoomMemberNames = myRoom ? myRoom.members.map(m => m.toLowerCase()) : [];

      const originalExpenses = expenses.filter(exp => {
        const currentSplitType = exp.split_type || 'individual';
        
        const isExpLender = isLenderRoom 
          ? (exp.paid_by_name === `Room ${lenderRoomNo}` || lenderRoomMembers.includes((exp.paid_by_name || '').toLowerCase()))
          : exp.paid_by_uid === lenderUid;

        return isExpLender &&
          exp.status !== 'completed' && exp.status !== 'pending_settlement' &&
          exp.participants?.some(p => {
            let isMe = false;
            if (currentSplitType === 'room') {
                isMe = p.uid === user.id || p.uid === user.student_id?.toString() || (myRoom && p.uid === `room-${myRoom.roomNo}`) || myRoomMemberNames.includes((p.name || '').toLowerCase());
            } else {
                isMe = p.uid === user.id || p.uid === user.student_id?.toString();
            }
            return isMe && p.amount > 0 && p.status !== 'completed' && p.status !== 'pending_settlement';
          });
      });
      const updatePromises = originalExpenses.map(exp => {
        const currentSplitType = exp.split_type || 'individual';
        const updatedParticipants = exp.participants.map(p => {
            let isMe = false;
            if (currentSplitType === 'room') {
                isMe = p.uid === user.id || p.uid === user.student_id?.toString() || (myRoom && p.uid === `room-${myRoom.roomNo}`) || myRoomMemberNames.includes((p.name || '').toLowerCase());
            } else {
                isMe = p.uid === user.id || p.uid === user.student_id?.toString();
            }
          return isMe ? { ...p, status: 'pending_settlement' } : p;
        });
        return updateDoc(doc(db, 'expenses', exp.id), { participants: updatedParticipants });
      });
      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Failed to send payment request:', err);
      throw err;
    }
  };

  const handleConfirmPaid = async (borrowerUid) => {
    try {
      const isRoom = borrowerUid.toString().startsWith('room-');
      let roomMembers = [];
      if (isRoom) {
        const roomNo = borrowerUid.replace('room-', '');
        const rData = ROOM_DATA.find(r => r.roomNo === roomNo);
        roomMembers = rData ? rData.members.map(m => m.toLowerCase()) : [];
      }

      let myRoom = null;
      if (user?.role === 'room') {
          myRoom = ROOM_DATA.find(r => r.roomNo === user.roomNo);
      } else if (user) {
          myRoom = ROOM_DATA.find(r => r.members.some(m => m.toLowerCase() === (user.name || '').toLowerCase()));
      }
      const myRoomMemberNames = myRoom ? myRoom.members.map(m => m.toLowerCase()) : [];

      const originalExpenses = expenses.filter(exp => {
        const currentSplitType = exp.split_type || 'individual';
        let isPayer = false;
        if (currentSplitType === 'room') {
            isPayer = exp.paid_by_uid === user.id || exp.paid_by_uid === user.student_id?.toString() || (myRoom && exp.paid_by_uid === `room-${myRoom.roomNo}`) || myRoomMemberNames.includes((exp.paid_by_name || '').toLowerCase());
        } else {
            isPayer = exp.paid_by_uid === user.id || exp.paid_by_uid === user.student_id?.toString();
        }
        
        return isPayer &&
        exp.participants?.some(p => {
          const matches = isRoom 
            ? roomMembers.includes((p.name || '').toLowerCase())
            : p.uid === borrowerUid;
          return matches && p.status === 'pending_settlement';
        });
      });
      const updatePromises = originalExpenses.map(exp => {
        const updatedParticipants = exp.participants.map(p => {
          const matches = isRoom 
            ? roomMembers.includes((p.name || '').toLowerCase())
            : p.uid === borrowerUid;
          return matches ? { ...p, status: 'completed' } : p;
        });
        return updateDoc(doc(db, 'expenses', exp.id), { participants: updatedParticipants });
      });
      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Failed to confirm payment:', err);
      throw err;
    }
  };

  const handleMarkAsPaid = async (borrowerUid) => {
    try {
      const isRoom = borrowerUid.toString().startsWith('room-');
      let roomMembers = [];
      if (isRoom) {
        const roomNo = borrowerUid.replace('room-', '');
        const rData = ROOM_DATA.find(r => r.roomNo === roomNo);
        roomMembers = rData ? rData.members.map(m => m.toLowerCase()) : [];
      }

      let myRoom = null;
      if (user?.role === 'room') {
          myRoom = ROOM_DATA.find(r => r.roomNo === user.roomNo);
      } else if (user) {
          myRoom = ROOM_DATA.find(r => r.members.some(m => m.toLowerCase() === (user.name || '').toLowerCase()));
      }
      const myRoomMemberNames = myRoom ? myRoom.members.map(m => m.toLowerCase()) : [];

      const originalExpenses = expenses.filter(exp => {
        const currentSplitType = exp.split_type || 'individual';
        let isPayer = false;
        if (currentSplitType === 'room') {
            isPayer = exp.paid_by_uid === user.id || exp.paid_by_uid === user.student_id?.toString() || (myRoom && exp.paid_by_uid === `room-${myRoom.roomNo}`) || myRoomMemberNames.includes((exp.paid_by_name || '').toLowerCase());
        } else {
            isPayer = exp.paid_by_uid === user.id || exp.paid_by_uid === user.student_id?.toString();
        }

        return isPayer &&
        exp.status !== 'completed' && exp.status !== 'pending_settlement' &&
        exp.participants?.some(p => {
          const matches = isRoom 
            ? roomMembers.includes((p.name || '').toLowerCase())
            : p.uid === borrowerUid;
          return matches && p.amount > 0 && p.status !== 'completed';
        });
      });
      const updatePromises = originalExpenses.map(exp => {
        const updatedParticipants = exp.participants.map(p => {
          const matches = isRoom 
            ? roomMembers.includes((p.name || '').toLowerCase())
            : p.uid === borrowerUid;
          return matches ? { ...p, status: 'completed' } : p;
        });
        return updateDoc(doc(db, 'expenses', exp.id), { participants: updatedParticipants });
      });
      await Promise.all(updatePromises);
    } catch (err) {
      console.error('Failed to directly mark as paid:', err);
      throw err;
    }
  };

  const isRoomUser = user?.role === 'room';
  const rawStudentDetails = studentsData.find(s => s['رقم  ت']?.toString() === user?.student_id?.toString()) || {};
  const myRoom = isRoomUser ? ROOM_DATA.find(r => r.roomNo === user.roomNo) : null;
  
  const displayDetails = {
    name: isRoomUser ? user.name : (rawStudentDetails['الإسم الشخصي'] || user?.name || 'Unknown'),
    id: isRoomUser ? user.student_id : (rawStudentDetails['رقم  ت'] || user?.student_id || 'Unknown'),
    reg: isRoomUser ? 'Room Account' : (rawStudentDetails['رقم التسجيل'] || 'N/A'),
    passport: isRoomUser ? 'N/A' : (rawStudentDetails['رقم جواز السفر'] || 'N/A'),
    dob: isRoomUser ? 'N/A' : (rawStudentDetails['تاريخ الازدياد'] || 'N/A'),
    isRoom: isRoomUser,
    members: myRoom ? myRoom.members : [],
    photoURL: user?.photoURL || ''
  };

  return (
    <div className="flex h-[100svh] bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-[100svh] overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8" style={{ transform: 'translateZ(0)' }}>
          <div className="max-w-5xl mx-auto space-y-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Overview</h1>
                <p className="text-[12px] text-slate-500 mt-0.5 font-medium">Track your shared expenses in one place.</p>
              </div>
            </motion.div>

            {(displayDetails.name !== 'Unknown') && (
              <ProfileCard details={displayDetails} onEdit={() => setIsSettingsOpen(true)} />
            )}

            <div className="space-y-3">
              {/* Pending Endorsement Banners */}
              <AnimatePresence>
                {pendingEndorsements.map(req => (
                  <motion.div 
                    key={req.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 ml-2"
                  >
                    <div>
                      <h3 className="text-[11px] font-black uppercase text-indigo-800 tracking-wider flex items-center gap-1.5 mb-1">
                        <ArrowRightLeft size={14} /> Endorsement Request
                      </h3>
                      <p className="text-xs font-medium text-slate-700">
                        <span className="font-bold text-slate-900">{req.oldCreditorName}</span> wants to transfer <span className="font-bold text-slate-900">{req.fromDebtorName}</span>'s debt of <span className="font-bold text-indigo-700">{req.amount.toFixed(2)} DH</span> to you.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      <button 
                        onClick={() => handleRejectEndorsement(req.id)}
                        disabled={isEndorseActionLoading}
                        className="flex-1 sm:flex-none px-4 py-2 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleAcceptEndorsement(req)}
                        disabled={isEndorseActionLoading}
                        className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isEndorseActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />} Accept
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Action Buttons Container */}
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => setIsSplitModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.15)] hover:shadow-[0_6px_18px_rgba(37,99,235,0.2)] hover:-translate-y-0.5 transition-all flex items-center gap-2 mb-[-10px] relative z-10 ml-2"
                >
                  Split an Expense
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                    <ArrowUpRight size={12} strokeWidth={3} />
                  </div>
                </button>

                <button 
                  onClick={() => setIsEndorseModalOpen(true)}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[12px] font-bold rounded-xl transition-all flex items-center gap-2 mb-[-10px] relative z-10"
                >
                  <ArrowRightLeft size={14} strokeWidth={2.5} />
                  Endorse Debt
                </button>
              </div>
            </div>

            {/* INDIVIDUAL DEBTS (Primary) */}
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-2 px-2 border-b border-slate-200 pb-2">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2"><User size={16}/> Individual Debts</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DashboardCard 
                    title="You Owe" 
                    amount={individualStats.totalOwe} 
                    type="owe" 
                    icon={TrendingDown} 
                    details={individualStats.oweDetails}
                    pendingRequests={individualStats.pendingOutgoing}
                    onAction1={handleIPaid}
                    isSmall={false}
                    onRefresh={fetchExpenses}
                  />
                  <DashboardCard 
                    title="You are Owed" 
                    amount={individualStats.totalOwed} 
                    type="owed" 
                    icon={TrendingUp} 
                    details={individualStats.owedDetails}
                    pendingRequests={individualStats.pendingIncoming}
                    onAction1={handleConfirmPaid}
                    onAction2={handleMarkAsPaid}
                    isSmall={false}
                    onRefresh={fetchExpenses}
                  />
                </div>
                <TransactionList 
                    title="Individual Activity"
                    transactions={individualStats.transactionsList} 
                    showAll={showAllIndividualTransactions}
                    setShowAll={setShowAllIndividualTransactions}
                    user={user}
                    onDelete={async (expenseId) => {
                      if (!window.confirm('Are you sure you want to delete this expense? This will remove it for all members.')) return;
                      await deleteDoc(doc(db, 'expenses', expenseId));
                      fetchExpenses();
                    }}
                />
            </div>

            {/* ROOM DEBTS (Secondary / Compact) */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2 px-2">
                    <h2 className="text-[12px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Home size={14}/> Room-Wise Splits</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DashboardCard 
                    title="Room Total Owe" 
                    amount={roomStats.totalOwe} 
                    type="owe" 
                    icon={TrendingDown} 
                    details={roomStats.oweDetails}
                    pendingRequests={roomStats.pendingOutgoing}
                    onAction1={handleIPaid}
                    isSmall={true}
                    onRefresh={fetchExpenses}
                  />
                  <DashboardCard 
                    title="Room Total Owed" 
                    amount={roomStats.totalOwed} 
                    type="owed" 
                    icon={TrendingUp} 
                    details={roomStats.owedDetails}
                    pendingRequests={roomStats.pendingIncoming}
                    onAction1={handleConfirmPaid}
                    onAction2={handleMarkAsPaid}
                    isSmall={true}
                    onRefresh={fetchExpenses}
                  />
                </div>
                <TransactionList 
                    title="Room Activity"
                    transactions={roomStats.transactionsList} 
                    showAll={showAllRoomTransactions}
                    setShowAll={setShowAllRoomTransactions}
                    isCompact={true}
                    user={user}
                    onDelete={async (expenseId) => {
                      if (!window.confirm('Are you sure you want to delete this expense? This will remove it for all members.')) return;
                      await deleteDoc(doc(db, 'expenses', expenseId));
                      fetchExpenses();
                    }}
                />
            </div>

          </div>
        </main>
      </div>

      <SplitExpenseModal 
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        onExpenseAdded={fetchExpenses}
      />
      <EndorseDebtModal 
        isOpen={isEndorseModalOpen}
        onClose={() => setIsEndorseModalOpen(false)}
        oweDetails={individualStats.oweDetails}
        owedDetails={individualStats.owedDetails}
      />
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Add to Home Screen Button */}
      <div className="fixed bottom-6 right-6 z-40 transform-gpu" style={{ transform: 'translateZ(0)' }}>
        <button
          onClick={handleInstallApp}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl shadow-[0_8px_30px_rgb(37,99,235,0.3)] hover:bg-blue-700 hover:shadow-[0_8px_30px_rgb(37,99,235,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all text-[11px] font-black border border-blue-500 cursor-pointer"
        >
          <Download size={14} strokeWidth={2.5} />
          Install App
        </button>
      </div>
    </div>
  );
}

function DashboardCard({ title, amount, type, icon: Icon, details, pendingRequests, onAction1, onAction2, isSmall, onRefresh }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [processingState, setProcessingState] = useState({}); // { [uid]: 'idle' | 'processing' | 'done' }
  
  const colorClass = type === 'owe' ? 'text-red-500' : 'text-emerald-500';
  const bgClass = type === 'owe' ? 'bg-red-50/50' : 'bg-emerald-50/50';
  const borderClass = type === 'owe' ? 'border-red-100/50' : 'border-emerald-100/50';

  const runAnimatedAction = async (uid, actionFn) => {
    if (!actionFn) return;
    setProcessingState(prev => ({ ...prev, [uid]: 'processing' }));
    try {
      await actionFn(uid);
      setProcessingState(prev => ({ ...prev, [uid]: 'done' }));
      // Wait for the done animation to display fully (800ms) before refresh removes the element
      await new Promise(resolve => setTimeout(resolve, 800));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingState(prev => {
        const next = { ...prev };
        delete next[uid];
        return next;
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.01)] border ${borderClass} overflow-hidden relative group`}
    >
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-all select-none"
      >
        <div className="flex items-center gap-3">
          <div className={`${bgClass} p-2 rounded-xl`}>
            <Icon size={16} className={colorClass} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">{title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-baseline gap-0.5">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{amount.toFixed(2)}</h2>
            <span className="text-[10px] font-bold text-slate-400">DH</span>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden bg-slate-50/50"
            style={{ willChange: 'height, opacity', transform: 'translateZ(0)' }}
          >
            <div className="border-t border-slate-100 p-4 space-y-3">
              <AnimatePresence mode="popLayout">
                {details.length === 0 ? (
                  <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="text-xs text-slate-400 text-center font-medium py-2"
                  >
                    No active balances
                  </motion.p>
                ) : details.map((item) => {
                let actionUI = null;
                const state = processingState[item.uid] || 'idle';

                if (title.includes("You Owe") || title === "Room Total Owe") {
                  const pendingOut = pendingRequests.find(p => p.lender_uid === item.uid);
                  if (pendingOut) {
                    actionUI = (
                      <div className="flex items-center gap-1 px-1.5 py-1 bg-slate-100 rounded-md border border-slate-200">
                        <Clock size={10} className="text-slate-400" />
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Pending</span>
                      </div>
                    );
                  } else {
                    actionUI = (
                      <motion.button 
                        disabled={state === 'processing' || state === 'done'}
                        onClick={(e) => {
                          e.stopPropagation();
                          runAnimatedAction(item.uid, () => onAction1 && onAction1(item.uid, item.name, item.amount));
                        }}
                        className={`px-2 py-1 text-[9px] font-bold rounded-md border flex items-center justify-center gap-1 transition-all shadow-sm ${
                          state === 'processing' 
                            ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                            : state === 'done'
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white text-blue-600 hover:bg-blue-50 border-blue-100'
                        }`}
                        whileTap={{ scale: state === 'idle' ? 0.97 : 1 }}
                      >
                        {state === 'processing' ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Sending...
                          </>
                        ) : state === 'done' ? (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                            className="flex items-center gap-1"
                          >
                            Sent! 📨
                          </motion.span>
                        ) : (
                          'I Paid'
                        )}
                      </motion.button>
                    );
                  }
                } else if (title.includes("You are Owed") || title === "Room Total Owed") {
                  const pendingIn = pendingRequests.find(p => p.borrower_uid === item.uid);
                  if (pendingIn) {
                    actionUI = (
                      <motion.button 
                        disabled={state === 'processing' || state === 'done'}
                        onClick={(e) => {
                          e.stopPropagation();
                          runAnimatedAction(item.uid, () => onAction1 && onAction1(item.uid));
                        }}
                        className={`px-2 py-1 text-[9px] font-bold rounded-md flex items-center justify-center gap-1 transition-all shadow-sm ${
                          state === 'processing'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : state === 'done'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-orange-500 text-white hover:bg-orange-600 border border-orange-600'
                        }`}
                        whileTap={{ scale: state === 'idle' ? 0.97 : 1 }}
                      >
                        {state === 'processing' ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Confirming
                          </>
                        ) : state === 'done' ? (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                          >
                            Confirmed! ✅
                          </motion.span>
                        ) : (
                          'Confirm Paid'
                        )}
                      </motion.button>
                    );
                  } else {
                    actionUI = (
                      <motion.button 
                        disabled={state === 'processing' || state === 'done'}
                        onClick={(e) => {
                          e.stopPropagation();
                          runAnimatedAction(item.uid, () => onAction2 && onAction2(item.uid, item.name, item.amount));
                        }}
                        className={`px-2 py-1 text-[9px] font-bold rounded-md border flex items-center justify-center gap-1 transition-all shadow-sm ${
                          state === 'processing'
                            ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                            : state === 'done'
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100'
                        }`}
                        whileTap={{ scale: state === 'idle' ? 0.97 : 1 }}
                      >
                        {state === 'processing' ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Saving...
                          </>
                        ) : state === 'done' ? (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                            className="flex items-center gap-1"
                          >
                            Paid! 🎉
                          </motion.span>
                        ) : (
                          <>
                            Mark as Paid <Check size={10} strokeWidth={3} />
                          </>
                        )}
                      </motion.button>
                    );
                  }
                }

                return (
                  <motion.div 
                    key={item.uid} 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, paddingBottom: 0, paddingTop: 0, borderBottomWidth: 0 }}
                    transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                    className="flex items-start justify-between border-b border-slate-200/50 last:border-0 pb-3 last:pb-0 overflow-hidden" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="pt-0.5">
                      <p className="text-[11px] text-slate-600"><span className="font-extrabold text-slate-900">{item.name}</span></p>
                      <p className="text-[9px] text-slate-400 font-medium mt-0.5">{item.desc}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <p className="text-xs font-extrabold text-slate-900">{item.amount.toFixed(2)} <span className="text-[9px] text-slate-500 font-bold">DH</span></p>
                      {actionUI}
                    </div>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TransactionList({ title, transactions, showAll, setShowAll, isCompact, user, onDelete }) {
    const displayedTransactions = showAll ? transactions : transactions.slice(0, 3);
    const [expandedTxId, setExpandedTxId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-white ${isCompact ? 'rounded-2xl p-4' : 'rounded-[2rem] p-6'} shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100`}>
            <div className="flex items-center justify-between mb-6">
                <h3 className={`${isCompact ? 'text-[12px]' : 'text-sm'} font-black text-slate-800 uppercase tracking-widest`}>{title}</h3>
                <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-full">{transactions.length} Total</span>
            </div>
            
            <div className="space-y-4">
                {displayedTransactions.length === 0 ? (
                    <div className="text-center py-6 text-slate-400">
                        <FileText size={isCompact ? 24 : 32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-[11px] font-semibold">No recent activity</p>
                    </div>
                ) : displayedTransactions.map((tx, idx) => (
                    <div key={idx} onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)} className={`flex flex-col p-3 rounded-xl border cursor-pointer ${tx.isSettled ? 'bg-slate-50/50 border-slate-100' : 'bg-white border-slate-100 shadow-sm'} hover:shadow-md transition-all group`}>
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3 w-full max-w-[60%]">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tx.isSettled ? 'bg-slate-100 text-slate-400' : (tx.type === 'owe' ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500')}`}>
                                    {tx.isSettled ? <Check size={14} strokeWidth={3} /> : (tx.type === 'owe' ? <TrendingDown size={14} /> : <TrendingUp size={14} />)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-bold text-slate-800 truncate">
                                        {tx.isGroup ? 'Group Expense' : tx.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] font-semibold text-slate-400 truncate">
                                            {tx.isGroup ? tx.groupName : tx.person}
                                        </span>
                                        <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                        <span className="text-[9px] font-semibold text-slate-400 shrink-0">{tx.date}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right pl-3 shrink-0 flex items-center gap-2">
                                <div>
                                    <p className={`text-[12px] font-black ${tx.isSettled ? 'text-slate-400' : (tx.type === 'owe' ? 'text-red-500' : 'text-emerald-500')}`}>
                                        {tx.type === 'owe' ? '-' : '+'}{tx.amount.toFixed(2)} <span className="text-[9px]">DH</span>
                                    </p>
                                    {tx.isSettled && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Repaid</p>}
                                </div>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${expandedTxId === tx.id ? 'rotate-180' : ''}`} />
                            </div>
                        </div>

                        <AnimatePresence>
                            {expandedTxId === tx.id && tx.originalExp && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                                    className="overflow-hidden"
                                    style={{ willChange: 'height, opacity', transform: 'translateZ(0)' }}
                                >
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                        <p className="text-[10px] font-semibold text-slate-500">
                                            <span className="text-slate-800 font-bold">{tx.originalExp.paid_by_name}</span> paid <span className="font-bold text-slate-800">{parseFloat(tx.originalExp.total_amount || tx.originalExp.amount || 0).toFixed(2)} DH</span>
                                        </p>
                                        <div className="bg-slate-50 rounded-lg p-2 space-y-1">
                                            {tx.originalExp.participants?.map((p, i) => {
                                                const isPayer = p.uid === tx.originalExp.paid_by_uid;
                                                const isParticipantPaid = isPayer || p.status === 'completed' || tx.originalExp.status === 'completed';
                                                return (
                                                <div key={i} className="flex items-center justify-between text-[10px]">
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
                                    </div>

                                    {/* Delete button - only visible to the payer */}
                                    {onDelete && user && (tx.originalExp.paid_by_uid === user.id || tx.originalExp.paid_by_uid === user.student_id?.toString()) && (
                                        <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                                            <button
                                                disabled={deletingId === tx.originalExp.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeletingId(tx.originalExp.id);
                                                    onDelete(tx.originalExp.id).finally(() => setDeletingId(null));
                                                }}
                                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-lg border border-red-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                            >
                                                {deletingId === tx.originalExp.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                Delete Expense
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {transactions.length > 3 && (
                <button 
                    onClick={() => setShowAll(!showAll)}
                    className="w-full mt-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 text-[10px] font-bold rounded-xl transition-colors uppercase tracking-widest"
                >
                    {showAll ? 'Show Less' : 'View All History'}
                </button>
            )}
        </motion.div>
    );
}

function ProfileCard({ details, onEdit }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const user = useAuthStore((state) => state.user);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropperImageSrc(reader.result);
      setIsCropping(true);
    });
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input so same file can be selected again
  };

  const handleCropComplete = async (croppedBlob) => {
    setIsCropping(false);
    setUploading(true);

    try {
      // 1. Client-side Image Compression
      const options = {
        maxSizeMB: 0.03,
        maxWidthOrHeight: 250,
        useWebWorker: true
      };
      
      const compressedFile = await imageCompression(croppedBlob, options);
      
      // 2. Read as Base64 string
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = async () => {
        try {
          const base64data = reader.result;

          // 3. Save Base64 string directly to Firestore profile document
          const docRef = doc(db, 'profiles', user.id);
          await setDoc(docRef, { photoURL: base64data }, { merge: true });

          // 4. Synchronize states
          const { setUser } = useAuthStore.getState();
          setUser({ ...user, photoURL: base64data });
        } catch (dbErr) {
          console.error(dbErr);
          alert('Failed to save photo to database.');
        } finally {
          setUploading(false);
          setCropperImageSrc(null);
        }
      };
    } catch (err) {
      console.error(err);
      alert('Failed to compress profile photo.');
      setUploading(false);
      setCropperImageSrc(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-3xl shadow-[0_8_30_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden max-w-sm mx-auto mb-8 relative group hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] transition-all duration-300"
    >
      <div className="h-24 bg-gradient-to-r from-[#0088cc] to-[#00aaff] w-full relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
        <button 
          onClick={onEdit}
          className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg text-white transition-all group/edit outline-none cursor-pointer"
        >
          <Edit3 size={14} strokeWidth={2.5} className="group-hover/edit:scale-110 transition-transform" />
        </button>
      </div>
      
      <div className="flex justify-center -mt-12 relative z-10">
        <div className="w-24 h-24 bg-white rounded-full p-1 shadow-sm relative group/avatar cursor-pointer hover:scale-105 transition-transform duration-500 ease-out">
           <div className="w-full h-full bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 overflow-hidden relative">
             {details.photoURL ? (
               <img src={details.photoURL} alt="Profile" className="w-full h-full object-cover animate-fade-in" />
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-3xl uppercase">
                 {details.name ? details.name.charAt(0) : <User size={36} />}
               </div>
             )}

             {/* Hover Upload Overlay */}
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="absolute inset-0 bg-black/45 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-black gap-0.5 px-1.5 text-center leading-tight cursor-pointer"
             >
               <Camera size={15} strokeWidth={2.5} />
               <span>{details.photoURL ? 'Change Photo' : 'Upload Photo'}</span>
             </div>

             {/* Loader Overlay */}
             {uploading && (
               <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                 <Loader2 size={24} className="animate-spin text-blue-400" />
               </div>
             )}
           </div>
        </div>

        <input 
          type="file"
          ref={fileInputRef}
          onChange={handlePhotoChange}
          accept="image/*"
          className="hidden"
          disabled={uploading}
        />
      </div>

      <div className="text-center mt-3 px-6 pb-2">
        <h2 className="text-lg tracking-tight font-extrabold text-slate-900">{details.name}</h2>
        <p className="text-[#0088cc] font-semibold mt-1 text-[10px] bg-blue-50/50 inline-block px-3 py-0.5 rounded-full border border-blue-100/50 uppercase tracking-widest">ID: {details.id}</p>
      </div>

      <div className="p-5 pt-4">
        <div className="bg-slate-50/80 rounded-xl p-4 space-y-3 border border-slate-100/50 relative overflow-hidden group-hover:bg-slate-50 transition-colors duration-300">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#0088cc] to-[#00aaff] opacity-20"></div>
          
          <div className="relative z-10">
            <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-0.5">Registration</p>
            <p className="text-[13px] font-semibold text-slate-800">{details.reg}</p>
          </div>
          
          {details.isRoom && details.members && details.members.length > 0 && (
            <div className="relative z-10 pt-3 mt-3 border-t border-slate-200/50 space-y-2">
              <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase flex items-center gap-1.5">
                <Users size={11} className="text-slate-400" /> Room Members
              </p>
              <div className="space-y-1.5">
                {details.members.map((member, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-100 hover:border-slate-200/80 hover:shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-200">
                    <div className="w-6 h-6 rounded-lg bg-blue-50/80 border border-blue-100 flex items-center justify-center shrink-0">
                      <span className="text-[#0088cc] text-[10px] font-extrabold">{member.charAt(0)}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 truncate">{member}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!details.isRoom && (
            <>
              <div className="relative z-10">
                <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-0.5">Passport</p>
                <p className="text-[13px] font-semibold text-slate-800">{details.passport}</p>
              </div>
              <div className="relative z-10">
                <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-0.5">Date of Birth</p>
                <p className="text-[13px] font-semibold text-slate-800">{details.dob}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Profile Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropping}
        imageSrc={cropperImageSrc}
        onClose={() => {
          setIsCropping(false);
          setCropperImageSrc(null);
        }}
        onCropComplete={handleCropComplete}
        isSaving={uploading}
      />
    </motion.div>
  );
}
