// BULLETPROOF LOCAL DATABASE ENGINE (FIXED)
const STORAGE_KEYS = {
  USERS: 'expense_app_users',
  EXPENSES: 'expense_app_expenses',
  SESSION: 'expense_app_session_only'
};

import studentsData from '../data/students.json';

const getLocalData = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const setLocalData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// Initialize users if empty
if (getLocalData(STORAGE_KEYS.USERS).length === 0) {
  const initialUsers = studentsData.map(s => ({
    id: Math.random().toString(36).substr(2, 9),
    student_id: s['رقم  ت'].toString(),
    name: s['الإسم الشخصي'],
    password: s['رقم  ت'].toString().padStart(6, '0')
  }));
  setLocalData(STORAGE_KEYS.USERS, initialUsers);
}

export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }) => {
      await new Promise(r => setTimeout(r, 300));
      const studentId = email.split('@')[0];
      const users = getLocalData(STORAGE_KEYS.USERS);
      const user = users.find(u => u.student_id === studentId && u.password === password);
      
      if (user) {
        sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
        return { data: { user }, error: null };
      }
      return { data: { user: null }, error: { message: 'Invalid Student ID or Password.' } };
    },
    getSession: async () => {
      const session = sessionStorage.getItem(STORAGE_KEYS.SESSION);
      return { data: { session: session ? JSON.parse(session) : null }, error: null };
    },
    signOut: async () => {
      sessionStorage.removeItem(STORAGE_KEYS.SESSION);
      return { error: null };
    },
    updateUser: async ({ password }) => {
      const session = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.SESSION));
      if (!session) return { error: { message: 'Not logged in' } };
      const users = getLocalData(STORAGE_KEYS.USERS);
      const idx = users.findIndex(u => u.student_id === session.student_id);
      if (idx !== -1) {
        users[idx].password = password;
        setLocalData(STORAGE_KEYS.USERS, users);
      }
      return { data: { user: session }, error: null };
    }
  },
  from: (table) => ({
    select: (columns) => ({
      order: () => ({
        data: getLocalData(STORAGE_KEYS.USERS),
        error: null
      }),
      ilike: (col, val) => ({
        single: () => {
          const users = getLocalData(STORAGE_KEYS.USERS);
          const user = users.find(u => u.name.toLowerCase().includes(val.toLowerCase()));
          return { data: user, error: user ? null : { message: 'Not found' } };
        }
      }),
      eq: (col, val) => ({
        single: () => {
          const users = getLocalData(STORAGE_KEYS.USERS);
          const user = users.find(u => u.id === val || u.student_id === val);
          return { data: user, error: user ? null : { message: 'Not found' } };
        }
      })
    }),
    insert: async (data) => {
      const expenses = getLocalData(STORAGE_KEYS.EXPENSES);
      const newExpense = { ...data[0], id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() };
      expenses.push(newExpense);
      setLocalData(STORAGE_KEYS.EXPENSES, expenses);
      return { data: [newExpense], error: null };
    },
    update: () => ({
      eq: () => ({ error: null })
    })
  })
};
