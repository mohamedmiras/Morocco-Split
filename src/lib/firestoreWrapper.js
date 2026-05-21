import { 
  collection as fbCollection, 
  query as fbQuery, 
  orderBy as fbOrderBy, 
  getDocs as fbGetDocs, 
  addDoc as fbAddDoc, 
  where as fbWhere, 
  deleteDoc as fbDeleteDoc,
  doc as fbDoc,
  updateDoc as fbUpdateDoc,
  getDoc as fbGetDoc,
  setDoc as fbSetDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { isDemoMode, demoDbState } from './demoData';

// Generate random IDs for demo
const generateId = () => Math.random().toString(36).substr(2, 9);

// Mock Query logic (very basic)
class MockQuery {
  constructor(collectionName, conditions = [], order = null) {
    this.collectionName = collectionName;
    this.conditions = conditions;
    this.order = order;
  }
}

export const collection = (dbRef, collectionName) => {
  if (isDemoMode) {
    return new MockQuery(collectionName);
  }
  return fbCollection(dbRef, collectionName);
};

export const query = (col, ...constraints) => {
  if (isDemoMode) {
    const q = new MockQuery(col.collectionName, [...col.conditions]);
    constraints.forEach(c => {
      if (c.type === 'where') q.conditions.push(c);
      if (c.type === 'orderBy') q.order = c;
    });
    return q;
  }
  return fbQuery(col, ...constraints);
};

export const where = (field, op, value) => {
  if (isDemoMode) return { type: 'where', field, op, value };
  return fbWhere(field, op, value);
};

export const orderBy = (field, dir = 'asc') => {
  if (isDemoMode) return { type: 'orderBy', field, dir };
  return fbOrderBy(field, dir);
};

export const doc = (dbRef, collectionName, id) => {
  if (isDemoMode) return { isDoc: true, collectionName, id };
  return fbDoc(dbRef, collectionName, id);
};

export const getDocs = async (q) => {
  if (isDemoMode) {
    const colData = demoDbState[q.collectionName] || [];
    let filtered = [...colData];

    q.conditions.forEach(c => {
      filtered = filtered.filter(item => {
        if (c.op === '==') return item[c.field] === c.value;
        if (c.op === 'array-contains') return item[c.field] && item[c.field].includes(c.value);
        return true;
      });
    });

    if (q.order) {
      filtered.sort((a, b) => {
        const valA = a[q.order.field];
        const valB = b[q.order.field];
        if (valA < valB) return q.order.dir === 'asc' ? -1 : 1;
        if (valA > valB) return q.order.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return {
      docs: filtered.map(item => ({
        id: item.id,
        data: () => item
      }))
    };
  }
  return fbGetDocs(q);
};

export const getDoc = async (docRef) => {
  if (isDemoMode) {
    const colData = demoDbState[docRef.collectionName] || [];
    const item = colData.find(i => i.id === docRef.id);
    return {
      exists: () => !!item,
      data: () => item
    };
  }
  return fbGetDoc(docRef);
};

export const addDoc = async (col, data) => {
  if (isDemoMode) {
    const newDoc = { id: `demo-id-${generateId()}`, ...data };
    if (!demoDbState[col.collectionName]) demoDbState[col.collectionName] = [];
    demoDbState[col.collectionName].push(newDoc);
    return { id: newDoc.id };
  }
  return fbAddDoc(col, data);
};

export const updateDoc = async (docRef, data) => {
  if (isDemoMode) {
    const colData = demoDbState[docRef.collectionName] || [];
    const index = colData.findIndex(i => i.id === docRef.id);
    if (index > -1) {
      colData[index] = { ...colData[index], ...data };
    }
    return;
  }
  return fbUpdateDoc(docRef, data);
};

export const setDoc = async (docRef, data) => {
  if (isDemoMode) {
    const colData = demoDbState[docRef.collectionName] || [];
    const index = colData.findIndex(i => i.id === docRef.id);
    if (index > -1) {
      colData[index] = { ...colData[index], ...data };
    } else {
      colData.push({ id: docRef.id, ...data });
    }
    return;
  }
  return fbSetDoc(docRef, data);
};

export const deleteDoc = async (docRef) => {
  if (isDemoMode) {
    const colData = demoDbState[docRef.collectionName] || [];
    demoDbState[docRef.collectionName] = colData.filter(i => i.id !== docRef.id);
    return;
  }
  return fbDeleteDoc(docRef);
};
