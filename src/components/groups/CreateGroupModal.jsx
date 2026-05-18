import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Search, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import studentsData from '../../data/students.json';

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

export default function CreateGroupModal({ isOpen, onClose }) {
  const user = useAuthStore((state) => state.user);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  
  const getInitialMember = () => {
    if (!user) return [];
    const uid = user.student_id?.toString() || user.id?.toString();
    const formattedName = formatName(user.name || user.email || 'Anonymous');
    return [{ uid, name: formattedName }];
  };

  const [selectedMembers, setSelectedMembers] = useState(getInitialMember);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const loggedInStudentId = parseInt(user?.student_id);
  const GIRL_IDS = [6, 9, 16, 17, 29];
  const ALLOWED_BOY_IDS = [4, 18, 34];

  const filteredStudents = studentsData.filter(s => {
    const studentId = parseInt(s['رقم  ت']);
    
    // Apply gender filtering rules:
    if (GIRL_IDS.includes(loggedInStudentId)) {
      if (!GIRL_IDS.includes(studentId)) return false;
    } else if (ALLOWED_BOY_IDS.includes(loggedInStudentId)) {
      // Allowed boys can see everyone
    } else {
      // Other boys cannot see girls
      if (GIRL_IDS.includes(studentId)) return false;
    }

    const englishName = formatName(s['الإسم الشخصي'] || '');
    if (!search) return true;
    const n = englishName.toLowerCase();
    const q = search.toLowerCase();
    return n.includes(q);
  });

  const toggleMember = (student) => {
    const uid = student['رقم  ت']?.toString();
    const sName = formatName(student['الإسم الشخصي']);
    
    if (selectedMembers.find(m => m.uid === uid)) {
      if (uid === user.student_id?.toString() || uid === user.id?.toString()) return; // cannot remove self
      setSelectedMembers(prev => prev.filter(m => m.uid !== uid));
    } else {
      setSelectedMembers(prev => [...prev, { uid, name: sName }]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || selectedMembers.length < 2) return;

    setLoading(true);
    try {
      const groupData = {
        name,
        description,
        members: selectedMembers,
        memberUids: selectedMembers.map(m => m.uid),
        createdBy: user.student_id?.toString() || user.id?.toString(),
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'groups'), groupData);
      onClose();
      setName('');
      setDescription('');
      setSelectedMembers(getInitialMember());
    } catch (err) {
      console.error(err);
      alert("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Create Group</h2>
            <p className="text-[11px] text-slate-500 font-medium">Create a space for a trip or room.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={18} className="text-slate-500" strokeWidth={2.5} /></button>
        </div>

        <div className="p-5 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Group Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} type="text" placeholder="e.g. Casablanca Trip" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-shadow" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none h-20 transition-shadow" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Add Members</label>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-shadow"
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-h-52 overflow-y-auto mb-4 custom-scrollbar">
                {filteredStudents.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center font-medium">No students found.</div>
                ) : filteredStudents.map(student => {
                  const uid = student['رقم  ت']?.toString();
                  const isSelected = selectedMembers.some(m => m.uid === uid);
                  const englishName = formatName(student['الإسم الشخصي'] || '');
                  return (
                    <div 
                      key={uid} 
                      onClick={() => toggleMember(student)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                    >
                      <span className="text-[13px] font-bold text-slate-700">{englishName}</span>
                      {isSelected && <Check size={14} className="text-blue-600" strokeWidth={3} />}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedMembers.map(m => (
                  <div key={m.uid} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1">
                    {m.name}
                    {m.uid !== user?.student_id?.toString() && m.uid !== user?.id?.toString() && (
                      <button type="button" onClick={() => toggleMember({'رقم  ت': m.uid, 'الإسم الشخصي': m.name})} className="text-indigo-400 hover:text-red-500 transition-colors ml-0.5">
                        <X size={12} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !name.trim() || selectedMembers.length < 2}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-[0_4px_12px_rgba(37,99,235,0.15)]"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
              Create Group
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
