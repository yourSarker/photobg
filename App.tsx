
import React, { useState, useCallback, useRef } from 'react';
import { GeminiService } from './services/geminiService';
import { ImageState, ProcessingStatus, RemovalPresets } from './types';
import { UploadIcon, MagicIcon, TrashIcon, DownloadIcon, InfoIcon } from './components/Icons';

const App: React.FC = () => {
  const [image, setImage] = useState<ImageState | null>(null);
  const [instruction, setInstruction] = useState<string>('');
  const [showCheckerboard, setShowCheckerboard] = useState<boolean>(true);
  const [status, setStatus] = useState<ProcessingStatus>({
    isLoading: false,
    message: '',
    error: null
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleRemove = async (customInstruction?: string) => {
    if (!image) return;

    const finalInstruction = customInstruction || instruction || RemovalPresets.TRANSPARENT_BG;

    setStatus({
      isLoading: true,
      message: 'Processing your image with AI magic...',
      error: null
    });

    try {
      const gemini = GeminiService.getInstance();
      const resultUrl = await gemini.editImage(
        image.originalBase64,
        image.mimeType,
        finalInstruction
      );

      setImage(prev => prev ? { ...prev, resultUrl } : null);
      setStatus({ isLoading: false, message: '', error: null });
    } catch (err: any) {
      setStatus({
        isLoading: false,
        message: '',
        error: err.message || 'Something went wrong. Please try again.'
      });
    }
  };

  const resetImage = () => {
    setImage(null);
    setInstruction('');
    setStatus({ isLoading: false, message: '', error: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadImage = () => {
    if (!image?.resultUrl) return;
    const link = document.createElement('a');
    link.href = image.resultUrl;
    link.download = `magic-eraser-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl magic-gradient shadow-lg">
            <MagicIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Magic Eraser AI</h1>
            <p className="text-slate-400 text-sm">Powered by Gemini Pro Vision</p>
          </div>
        </div>
        
        <div className="hidden md:flex gap-4">
          <button 
            onClick={() => window.open('https://ai.google.dev', '_blank')}
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Documentation
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl flex flex-col gap-8">
        {!image ? (
          <div className="w-full flex flex-col items-center justify-center min-h-[500px] border-2 border-dashed border-slate-700 rounded-3xl glass-morphism p-12 text-center group transition-all hover:border-indigo-500/50">
            <div className="p-6 rounded-full bg-slate-800 mb-6 group-hover:scale-110 transition-transform">
              <UploadIcon />
            </div>
            <h2 className="text-3xl font-bold mb-4">Make image backgrounds transparent</h2>
            <p className="text-slate-400 max-w-md mb-8">
              Upload a photo and our AI will remove the background. We force PNG output to ensure transparency works for you.
            </p>
            <label className="magic-gradient px-8 py-4 rounded-full font-bold cursor-pointer shadow-xl hover:shadow-indigo-500/20 active:scale-95 transition-all">
              Choose Photo
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileUpload} 
                accept="image/*" 
              />
            </label>
            <p className="mt-4 text-xs text-slate-500">Supports JPG, PNG, WEBP. Max 10MB.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Image Previews */}
            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-2">Original Photo</span>
                  <div className="relative rounded-2xl overflow-hidden glass-morphism aspect-square border border-slate-700">
                    <img src={image.originalUrl} alt="Original" className="w-full h-full object-contain" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-2 mr-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {image.resultUrl ? 'Magic Result' : 'Awaiting Processing'}
                    </span>
                    {image.resultUrl && (
                      <button 
                        onClick={() => setShowCheckerboard(!showCheckerboard)}
                        className="text-[10px] font-bold uppercase px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
                      >
                        {showCheckerboard ? 'Hide Grid' : 'Show Grid'}
                      </button>
                    )}
                  </div>
                  <div className={`relative rounded-2xl overflow-hidden glass-morphism aspect-square border border-slate-700 flex items-center justify-center ${image.resultUrl && showCheckerboard ? 'checkerboard' : ''}`}>
                    {status.isLoading ? (
                      <div className="flex flex-col items-center gap-4 bg-slate-900/80 p-8 rounded-2xl backdrop-blur-sm z-10">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-indigo-400 font-medium animate-pulse">{status.message}</p>
                      </div>
                    ) : image.resultUrl ? (
                      <img src={image.resultUrl} alt="Result" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-slate-600 flex flex-col items-center gap-3 bg-slate-900/40 p-8 rounded-2xl">
                        <MagicIcon />
                        <p className="text-sm">Click an option to see magic</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {image.resultUrl && !status.isLoading && (
                <div className="flex gap-4">
                  <button 
                    onClick={downloadImage}
                    className="flex-1 magic-gradient py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                  >
                    <DownloadIcon />
                    Download PNG (Transparent)
                  </button>
                  <button 
                    onClick={resetImage}
                    className="px-6 bg-slate-800 py-4 rounded-xl font-bold hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <TrashIcon />
                    Discard
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Controls */}
            <div className="lg:col-span-4 space-y-6">
              <div className="glass-morphism rounded-2xl p-6 border border-slate-700 shadow-xl sticky top-8">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MagicIcon />
                  Removal Options
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">One-Click Actions</label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => handleRemove(RemovalPresets.TRANSPARENT_BG)}
                        disabled={status.isLoading}
                        className="w-full text-left p-4 rounded-xl border-2 transition-all group bg-indigo-500/10 border-indigo-500/50 hover:bg-indigo-500/20 active:scale-[0.98]"
                      >
                        <span className="block font-bold text-indigo-300 mb-1 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                          Transparent Background
                        </span>
                        <span className="block text-xs text-slate-400 leading-relaxed">
                          Remove background and convert to PNG with alpha transparency.
                        </span>
                      </button>

                      <button
                        onClick={() => handleRemove(RemovalPresets.ENHANCE)}
                        disabled={status.isLoading}
                        className="w-full text-left p-3 rounded-lg border border-slate-700 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 transition-all text-sm group"
                      >
                        <span className="block font-medium text-emerald-300">Enhance Quality</span>
                        <span className="block text-xs text-slate-500">Upscale, sharpen and fix lighting</span>
                      </button>
                      
                      <button
                        onClick={() => handleRemove(RemovalPresets.OBJECTS)}
                        disabled={status.isLoading}
                        className="w-full text-left p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 transition-all text-sm group"
                      >
                        <span className="block font-medium text-slate-200">Remove Objects</span>
                        <span className="block text-xs text-slate-500">Heal areas behind objects</span>
                      </button>

                      <button
                        onClick={() => handleRemove(RemovalPresets.TEXT)}
                        disabled={status.isLoading}
                        className="w-full text-left p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 transition-all text-sm group"
                      >
                        <span className="block font-medium text-slate-200">Remove Text/Watermark</span>
                        <span className="block text-xs text-slate-500">Remove text and captions</span>
                      </button>

                      <button
                        onClick={() => handleRemove(RemovalPresets.CLEANUP)}
                        disabled={status.isLoading}
                        className="w-full text-left p-3 rounded-lg border border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 transition-all text-sm group"
                      >
                        <span className="block font-medium text-slate-200">Clean Up Image</span>
                        <span className="block text-xs text-slate-500">Retouch and remove minor blemishes</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <label className="text-sm text-slate-400 mb-2 block">Custom Removal Prompt</label>
                    <textarea 
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="e.g. Remove the blue car on the left"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 transition-colors min-h-[80px] resize-none"
                    />
                    <button 
                      onClick={() => handleRemove()}
                      disabled={status.isLoading}
                      className="w-full mt-3 bg-white text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {status.isLoading ? 'Processing...' : 'Run Magic Erase'}
                    </button>
                  </div>

                  {status.error && (
                    <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3">
                      <div className="shrink-0"><InfoIcon /></div>
                      <p>{status.error}</p>
                    </div>
                  )}

                  <div className="mt-6 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex gap-3">
                    <div className="shrink-0 text-indigo-400"><InfoIcon /></div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      <strong>Note:</strong> We automatically export as <strong>PNG</strong> to support transparency. If you see white background, try the "Transparent Background" button specifically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mt-20 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm pb-8">
        <p>© 2024 Magic Eraser AI. Private & Secure Processing.</p>
        <div className="flex gap-6">
          <span>PNG Alpha Support</span>
          <span>Terms</span>
          <span>Privacy</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
