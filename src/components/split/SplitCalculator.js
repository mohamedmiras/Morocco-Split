import { safeRound, safeAdd, safeSubtract, safeSum } from '../../lib/financialMath';

export const calculateSplit = (totalAmount, participants, splitMode, changedParticipantId = null, changedAmount = null) => {
  const selectedParticipants = participants.filter(p => p.selected);
  const total = safeRound(totalAmount) || 0;

  if (selectedParticipants.length === 0) {
    return participants.map(p => ({ ...p, amount: 0 }));
  }

  // SEPARATE EXPENSE MODE: No auto-splitting at all
  if (splitMode === 'separate') {
     // Amounts are entered manually and completely independently
     return participants.map(p => {
       if (p.id === changedParticipantId) {
         return { ...p, amount: safeRound(changedAmount) || 0, isManuallyEdited: true };
       }
       return p;
     });
  }

  // EQUAL SPLIT MODE
  if (splitMode === 'equal' && changedParticipantId === null) {
    const totalWeight = selectedParticipants.reduce((sum, p) => sum + (p.weight || 1), 0);
    const perUnit = totalWeight > 0 ? total / totalWeight : 0;
    
    let assignedTotal = 0;
    const baseAmounts = selectedParticipants.map(p => {
      const amt = safeRound(perUnit * (p.weight || 1));
      assignedTotal = safeAdd(assignedTotal, amt);
      return { id: p.id, amt };
    });
    
    const diff = safeSubtract(total, assignedTotal);
    
    let remainderAdded = false;
    return participants.map(p => {
      if (!p.selected) return { ...p, amount: 0 };
      const baseObj = baseAmounts.find(b => b.id === p.id);
      let finalAmt = baseObj ? baseObj.amt : 0;
      if (!remainderAdded && diff !== 0) {
        finalAmt = safeAdd(finalAmt, diff);
        remainderAdded = true;
      }
      return { ...p, amount: safeRound(finalAmt), isManuallyEdited: false };
    });
  }

  // CUSTOM SPLIT MODE (or Equal mode transitioning to Custom because of manual edit)
  const newParticipants = [...participants];
  
  if (changedParticipantId !== null) {
    const idx = newParticipants.findIndex(p => p.id === changedParticipantId);
    if (idx !== -1) {
      newParticipants[idx] = { 
        ...newParticipants[idx], 
        amount: safeRound(changedAmount) || 0,
        isManuallyEdited: true,
        selected: true
      };
    }
  }

  const activeSelected = newParticipants.filter(p => p.selected);
  const manuallyEditedParticipants = activeSelected.filter(p => p.isManuallyEdited);
  const autoParticipants = activeSelected.filter(p => !p.isManuallyEdited);
  
  const manualTotal = safeSum(manuallyEditedParticipants.map(p => p.amount || 0));
  const remainingTotal = Math.max(0, safeSubtract(total, manualTotal));
 
  if (autoParticipants.length > 0) {
    const totalAutoWeight = autoParticipants.reduce((sum, p) => sum + (p.weight || 1), 0);
    const perUnit = totalAutoWeight > 0 ? remainingTotal / totalAutoWeight : 0;

    let assignedTotal = 0;
    const baseAmounts = autoParticipants.map(p => {
      const amt = safeRound(perUnit * (p.weight || 1));
      assignedTotal = safeAdd(assignedTotal, amt);
      return { id: p.id, amt };
    });

    const diff = safeSubtract(remainingTotal, assignedTotal);
    
    let remainderAdded = false;
    return newParticipants.map(p => {
      if (!p.selected) return { ...p, amount: 0 };
      if (p.isManuallyEdited) return p;
      
      const baseObj = baseAmounts.find(b => b.id === p.id);
      let finalAmt = baseObj ? baseObj.amt : 0;
      if (!remainderAdded && diff !== 0) {
        finalAmt = safeAdd(finalAmt, diff);
        remainderAdded = true;
      }
      return { ...p, amount: safeRound(Math.max(0, finalAmt)) };
    });
  }

  return newParticipants;
};
