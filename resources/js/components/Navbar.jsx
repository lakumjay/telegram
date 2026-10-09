import React from 'react';
import { 
    Bot, 
    PhoneCall, 
    UploadCloud, 
    ShieldCheck, 
    Sliders, 
    Layers, 
    Search,
    MessageSquare,
    FolderArchive,
    FileText,
    LogOut
} from 'lucide-react';

export default function Navbar({ 
    activeTab, 
    setActiveTab, 
    onOpenCall, 
    onOpenUpload, 
    onOpenSettings,
    onLogout,
    stats 
}) {
    return (
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Brand */}
                    <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveTab('home')}>
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 p-2 shadow-md shadow-blue-500/20 flex items-center justify-center text-white">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-1.5">
                                <span className="font-black text-lg text-slate-900 tracking-tight">
                                    DocVoice AI
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">
                                Smart Telegram Document Assistant
                            </p>
                        </div>
                    </div>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <button
                            onClick={() => setActiveTab('home')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                                activeTab === 'home' 
                                    ? 'bg-white text-slate-900 shadow-xs' 
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <span>🏠 હોમ</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('files')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                                activeTab === 'files' 
                                    ? 'bg-white text-emerald-800 shadow-xs' 
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5 text-emerald-600" />
                            <span>📁 My Files</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('simulator')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                                activeTab === 'simulator' 
                                    ? 'bg-white text-blue-600 shadow-xs' 
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                            <span>💬 વૉઇસ ચેટ</span>
                        </button>
                    </nav>

                    {/* Right action: Upload & Logout */}
                    <div className="flex items-center space-x-2">
                        {/* CamScanner Button */}
                        <button
                            onClick={() => onOpenUpload('camera')}
                            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition cursor-pointer"
                            title="CamScanner"
                        >
                            <span>📷 CamScanner</span>
                        </button>

                        {/* Upload Button */}
                        <button
                            onClick={() => onOpenUpload('file')}
                            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition cursor-pointer"
                        >
                            <UploadCloud className="w-4 h-4 text-blue-600" />
                            <span>અપલોડ</span>
                        </button>

                        {/* Logout Button */}
                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className="flex items-center space-x-1 p-2 sm:px-3 sm:py-2 rounded-2xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition cursor-pointer text-xs font-bold"
                                title="Logout"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
