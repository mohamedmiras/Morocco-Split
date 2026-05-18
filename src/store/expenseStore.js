import { create } from 'zustand';

export const useExpenseStore = create((set) => ({
  expenses: [],
  isLoading: false,
  setExpenses: (expenses) => set({ expenses }),
  setLoading: (isLoading) => set({ isLoading }),
  addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, expense] })),
}));
