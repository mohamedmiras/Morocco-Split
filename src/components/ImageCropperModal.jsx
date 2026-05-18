import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2 } from 'lucide-react';
import { getCroppedImg } from '../utils/cropImage';

export default function ImageCropperModal({ isOpen, imageSrc, onClose, onCropComplete, isSaving }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBlob);
    } catch (e) {
      console.error(e);
      alert('Failed to crop image');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[70vh] max-h-[600px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 z-10 bg-white">
            <h3 className="font-extrabold text-slate-800 text-lg">Crop Photo</h3>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cropper Container */}
          <div className="relative flex-1 bg-slate-100 w-full">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={handleCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          {/* Controls Footer */}
          <div className="p-5 bg-white z-10 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-400">Zoom</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(e.target.value)}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check size={18} strokeWidth={3} /> Crop & Save
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
