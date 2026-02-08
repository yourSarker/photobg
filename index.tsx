import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- Types & Enums ---
enum RemovalPresets {
  TRANSPARENT_BG = "Remove the background completely and make it transparent. Return a PNG with an alpha channel.",
  OBJECTS = "Intelligently remove background objects and distractors while keeping the main subject.",
  TEXT = "Detect and remove all text, watermarks, or captions from the image.",
  CLEANUP = "Perform professional cleanup: remove blemishes, dust, and minor imperfections.",
  ENHANCE = "Upscale and enhance image quality, improve clarity, sharpness, and color balance."
}

interface ImageState {
  originalUrl: string;
  originalBase64: string;
  resultUrl: string | null;
  mimeType: string;
}

interface ProcessingStatus {
  isLoading: boolean;
  message: string;
  error: string | null;
}

// --- Icons ---
const Icons = {
  Upload: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
  ),
  Magic: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
  ),
  Download: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  ),
  Info: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  )
};

// --- Service ---
const editImage = async (base64Data: string, mimeType: string, instruction: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: mimeType } },
        { text: instruction },
      ],
    },
  });

  let editedImageBase64 = '';
  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        editedImageBase64 = part.inlineData.data;
        break;
      }
    }
  }

  if (!editedImageBase64) {
    throw new Error("AI did not return an image. Try being more specific about what to remove.");
  }

  return `data:image/png;base64,${editedImageBase64}`;
};

// --- App Component ---
const App: React.FC = () => {
  const [image, setImage] = useState<ImageState | null>(null);
  const [customInstruction, setCustomInstruction] = useState('');
  const [showGrid, setShowGrid] = useState(true);
  const [status, setStatus] = useState<ProcessingStatus>({
    isLoading: false,
    message: '',
    error: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatus(prev => ({ ...prev, error: 'Please upload a valid image file.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImage({
        originalUrl: reader.result as string,
        originalBase64: base64,
        resultUrl: null,
        mimeType: file.type
      });
      setStatus({ isLoading: false, message: '', error: null });
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (instruction: string) => {
    if (!image) return;
    setStatus({ isLoading: true, message: 'Gemini is processing your request...', error: null });
    
    try {
      const resultUrl = await editImage(image.originalBase64, image.mimeType, instruction);
      setImage(prev => prev ? { ...prev, resultUrl } : null);
      setStatus({ isLoading: false, message: '', error: null });
    } catch (err: any) {
      setStatus({ isLoading: false, message: '', error: err.message });
    }
  };

  const download = () => {
    if (!image?.resultUrl) return;
    const a = document.createElement('a');
    a.href = image.resultUrl;
    a.download = `magic-edit-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-8 md:py-12">
      {/* Navbar/Header */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 magic-gradient rounded-2xl flex items-center justify-center shadow-2xl animate-float">
            <Icons.Magic />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Magic Eraser
            </h1>
            <p className="text-slate-500 text-sm font-medium">AI-Powered Image Editing</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 glass px-4 py-2 rounded-full text-xs font-semibold text-slate-400 uppercase tracking-widest border-slate-800">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          Gemini 2.5 Flash Ready
        </div>
      </header>

      {!image ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group relative w-full aspect-[16/9] md:aspect-[21/9] flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-[2rem] glass cursor-pointer transition-all hover:border-indigo-500/50 hover:bg-slate-900/40"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]"></div>
          <div className="w-20 h-20 bg-slate-900/80 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Icons.Upload />
          </div>
          <h2 className="text-2xl font-bold mb-2">Drop your image here</h2>
          <p className="text-slate-500 text-center max-w-sm px-4">
            Enhance, remove backgrounds, or erase objects from your photos instantly with AI.
          </p>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Workspace */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Source Image</span>
                  <button onClick={() => setImage(null)} className="text-slate-500 hover:text-red-400 transition-colors">
                    <Icons.Trash />
                  </button>
                </div>
                <div className="relative aspect-square glass rounded-3xl overflow-hidden group">
                  <img src={image.originalUrl} className="w-full h-full object-contain" alt="Original" />
                </div>
              </div>

              {/* Result */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Magic Output</span>
                  {image.resultUrl && (
                    <button 
                      onClick={() => setShowGrid(!showGrid)}
                      className={`text-[10px] font-bold uppercase px-2 py-1 rounded transition-all ${showGrid ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}
                    >
                      Grid {showGrid ? 'On' : 'Off'}
                    </button>
                  )}
                </div>
                <div className={`relative aspect-square glass rounded-3xl overflow-hidden flex items-center justify-center ${image.resultUrl && showGrid ? 'checkerboard' : ''}`}>
                  {status.isLoading ? (
                    <div className="flex flex-col items-center gap-4 p-8 z-10">
                      <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-indigo-400 text-sm font-medium animate-pulse">{status.message}</p>
                    </div>
                  ) : image.resultUrl ? (
                    <img src={image.resultUrl} className="w-full h-full object-contain animate-in fade-in zoom-in duration-500" alt="Result" />
                  ) : (
                    <div className="text-slate-600 flex flex-col items-center gap-2 opacity-40">
                      <Icons.Magic />
                      <span className="text-xs">Select an action to begin</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {image.resultUrl && !status.isLoading && (
              <div className="flex gap-4">
                <button 
                  onClick={download}
                  className="flex-1 magic-gradient py-4 rounded-2xl font-bold text-white shadow-2xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <Icons.Download />
                  Download PNG
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Tools */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass rounded-[2rem] p-6 border-slate-800/50 shadow-2xl space-y-8">
              <div>
                <h3 className="text-sm font-bold uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                  <Icons.Magic />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <ActionButton 
                    title="Transparent BG" 
                    desc="Remove background & convert to PNG" 
                    onClick={() => processImage(RemovalPresets.TRANSPARENT_BG)}
                    loading={status.isLoading}
                    primary
                  />
                  <ActionButton 
                    title="Enhance" 
                    desc="Upscale, sharpen and fix lighting" 
                    onClick={() => processImage(RemovalPresets.ENHANCE)}
                    loading={status.isLoading}
                    accent="emerald"
                  />
                  <ActionButton 
                    title="Remove Objects" 
                    desc="Erase people or background items" 
                    onClick={() => processImage(RemovalPresets.OBJECTS)}
                    loading={status.isLoading}
                  />
                  <ActionButton 
                    title="Remove Text" 
                    desc="Clear watermarks and captions" 
                    onClick={() => processImage(RemovalPresets.TEXT)}
                    loading={status.isLoading}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800">
                <h3 className="text-sm font-bold uppercase text-slate-400 tracking-widest mb-4">Custom Prompt</h3>
                <textarea 
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="e.g. Remove the red cat on the couch"
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors min-h-[100px] mb-4"
                />
                <button 
                  onClick={() => processImage(customInstruction)}
                  disabled={status.isLoading || !customInstruction.trim()}
                  className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {status.isLoading ? 'Processing...' : 'Run Magic Erase'}
                </button>
              </div>

              {status.error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-3 animate-in slide-in-from-top-2">
                  <div className="shrink-0"><Icons.Info /></div>
                  <p>{status.error}</p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 glass rounded-3xl border-indigo-500/20 flex gap-4 items-start">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Icons.Info />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                <strong>Alpha Transparency:</strong> Our AI creates a real alpha channel. Download as PNG to use the image in your design projects immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-20 py-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between text-slate-600 text-[10px] uppercase tracking-widest gap-4">
        <p>&copy; 2025 Magic Eraser AI. Built with Google Gemini.</p>
        <div className="flex gap-8">
          <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacy Policy</span>
          <span className="hover:text-slate-400 cursor-pointer transition-colors">Terms of Service</span>
        </div>
      </footer>
    </div>
  );
};

interface ActionButtonProps {
  title: string;
  desc: string;
  onClick: () => void;
  loading: boolean;
  primary?: boolean;
  accent?: 'emerald' | 'indigo';
}

const ActionButton: React.FC<ActionButtonProps> = ({ title, desc, onClick, loading, primary, accent }) => {
  let styles = "w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.98] disabled:opacity-50 ";
  
  if (primary) {
    styles += "bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-100";
  } else if (accent === 'emerald') {
    styles += "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-100";
  } else {
    styles += "bg-slate-800/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 text-slate-200";
  }

  return (
    <button onClick={onClick} disabled={loading} className={styles}>
      <span className={`block font-bold text-sm mb-1 ${primary ? 'text-indigo-400' : accent === 'emerald' ? 'text-emerald-400' : 'text-white'}`}>
        {title}
      </span>
      <span className="block text-[11px] text-slate-500 leading-tight">
        {desc}
      </span>
    </button>
  );
};

// --- Mount App ---
const root = createRoot(document.getElementById('root')!);
root.render(<App />);