export let isDemoMode = false;

export const setDemoMode = (val) => {
  isDemoMode = val;
};

export const MOCK_PROFILES = [
  { id: 'demo-user-1', name: 'Alex Visitor', student_id: '900', email: 'alex@demo.com', role: 'member' },
  { id: 'demo-user-2', name: 'Sarah Jane', student_id: '901', email: 'sarah@demo.com', role: 'member' },
  { id: 'demo-user-3', name: 'Mike Tester', student_id: '902', email: 'mike@demo.com', role: 'member' },
  { id: 'demo-room-999', name: 'Room 999', student_id: '999', email: 'room999@demo.com', role: 'room', roomNo: '999' }
];

export const MOCK_EXPENSES = [
  {
    id: 'exp-demo-1',
    created_at: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
    description: 'Welcome Dinner',
    notes: 'Demo expense',
    paid_by_uid: 'demo-user-1',
    paid_by_name: 'Alex Visitor',
    split_mode: 'equal',
    split_type: 'individual',
    status: 'pending_settlement',
    total_amount: 150.0,
    participants: [
      { uid: 'demo-user-1', name: 'Alex Visitor', amount: 50.0, status: 'completed' },
      { uid: 'demo-user-2', name: 'Sarah Jane', amount: 50.0, status: 'pending_settlement' },
      { uid: 'demo-user-3', name: 'Mike Tester', amount: 50.0, status: 'pending_settlement' }
    ]
  },
  {
    id: 'exp-demo-2',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    description: 'Groceries',
    notes: '',
    paid_by_uid: 'demo-user-2',
    paid_by_name: 'Sarah Jane',
    split_mode: 'custom',
    split_type: 'individual',
    status: 'pending_settlement',
    total_amount: 80.0,
    participants: [
      { uid: 'demo-user-2', name: 'Sarah Jane', amount: 30.0, status: 'completed' },
      { uid: 'demo-user-1', name: 'Alex Visitor', amount: 50.0, status: 'pending_settlement' }
    ]
  }
];

export const MOCK_GROUPS = [
  {
    id: 'group-demo-1',
    name: 'Weekend Trip',
    created_at: new Date().toISOString(),
    memberUids: ['900', '901'],
    members: [
      { uid: '900', name: 'Alex Visitor' },
      { uid: '901', name: 'Sarah Jane' }
    ]
  }
];

// Initialize an in-memory mock database
export const demoDbState = {
  profiles: [...MOCK_PROFILES],
  expenses: [...MOCK_EXPENSES],
  groups: [...MOCK_GROUPS]
};
