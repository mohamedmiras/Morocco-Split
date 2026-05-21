import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, KeyRound, Loader2, CheckCircle2, AlertCircle, Save, Camera, Trash2, User } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { updatePassword } from 'firebase/auth';
import { doc, setDoc } from '../lib/firestoreWrapper';
import { useAuthStore } from '../store/authStore';
import imageCompression from 'browser-image-compression';
import ImageCropperModal from './ImageCropperModal';

export default function SettingsModal({ isOpen, onClose }) {
  const user = useAuthStore((state) => state.user);
  
  const fileInputRef = useRef(null);
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [uploading, setUploading] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setSuccess('');

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropperImageSrc(reader.result);
      setIsCropping(true);
    });
    reader.readAsDataURL(file);
    e.target.value = '';
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
          setPhotoURL(base64data);
          const { setUser } = useAuthStore.getState();
          setUser({ ...user, photoURL: base64data });

          setSuccess('Profile photo updated successfully!');
        } catch (dbErr) {
          console.error(dbErr);
          setError('Failed to save photo to database.');
        } finally {
          setUploading(false);
          setCropperImageSrc(null);
        }
      };
    } catch (err) {
      console.error(err);
      setError('Failed to compress profile photo.');
      setUploading(false);
      setCropperImageSrc(null);
    }
  };

  const handleRemovePhoto = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // 1. Remove link from Firestore
      const docRef = doc(db, 'profiles', user.id);
      await setDoc(docRef, { photoURL: '' }, { merge: true });
      
      // 2. Synchronize states
      setPhotoURL('');
      const { setUser } = useAuthStore.getState();
      setUser({ ...user, photoURL: '' });
      
      setSuccess('Profile photo removed.');
    } catch (err) {
      console.error(err);
      setError('Failed to remove photo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const timeout = (ms) => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timed out. Please try again.')), ms)
      );

      // Validate password inputs
      if (!newPassword || !confirmPassword) {
        throw new Error('Please fill in both password fields.');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      const paddedPassword = newPassword.padStart(6, '0');
      if (!auth.currentUser) throw new Error("Not logged in");

      // 1. Update Password in Firebase Auth
      const updatePasswordPromise = updatePassword(auth.currentUser, paddedPassword);
      await Promise.race([updatePasswordPromise, timeout(15000)]);

      // 2. Update Password in Firestore Profile (using setDoc with merge: true)
      const docRef = doc(db, 'profiles', user.id);
      const updatePasswordInDbPromise = setDoc(docRef, { password: paddedPassword }, { merge: true });
      await Promise.race([updatePasswordInDbPromise, timeout(15000)]);

      setSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      
      // Close modal after a short delay on success
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1500);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update password.');
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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-white/20"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Edit Profile</h3>
                <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest mt-1">Update your details</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all hover:rotate-90"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <form onSubmit={handleSaveAll} className="p-8 pt-4 space-y-6">
              {/* Photo Upload Widget */}
              <div className="flex flex-col items-center gap-3 pb-2">
                <div className="relative group w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-md bg-slate-50 flex items-center justify-center cursor-pointer">
                  {photoURL ? (
                    <img 
                      src={photoURL} 
                      alt="Profile" 
                      className="w-full h-full object-cover animate-fade-in"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-3xl uppercase">
                      {user?.name ? user.name.charAt(0) : <User size={32} />}
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1"
                  >
                    <Camera size={18} />
                    <span>Upload</span>
                  </div>

                  {/* Uploading Spinner Overlay */}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                      <Loader2 size={24} className="animate-spin text-blue-400" />
                    </div>
                  )}
                </div>

                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                />

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    Upload Photo
                  </button>
                  {photoURL && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Profile Fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="relative group">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Change Password</label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none text-slate-900 font-bold placeholder-slate-300 text-sm"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="relative group">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Confirm Password</label>
                    <div className="relative">
                      <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-100 rounded-[1.25rem] focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none text-slate-900 font-bold placeholder-slate-300 text-sm"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[12px] font-bold flex items-center gap-3"
                >
                  <AlertCircle size={18} /> {error}
                </motion.div>
              )}

              {success && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-[12px] font-bold flex items-center gap-3"
                >
                  <CheckCircle2 size={18} /> {success}
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-slate-900 hover:bg-black text-white text-sm font-black rounded-[1.5rem] shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-4"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Save size={20} strokeWidth={2.5} />
                    Save All Changes
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>
      )}

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
    </AnimatePresence>
  );
}
