import React from 'react';
import { 
    Bot, 
    UploadCloud, 
    Layers, 
    LogOut,
    Home,
    ShieldCheck
} from 'lucide-react';

export default function Navbar({ 
    activeTab, 
    setActiveTab, 
    onOpenUpload, 
    onLogout 
}) {
    return (
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                    {/* Brand */}
                    <div 
                        className="flex items-center space-x-2.5 cursor-pointer" 
                        onClick={() => setActiveTab('home')}
                    >
                        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="font-extrabold text-base text-slate-900 tracking-tight leading-none">
                                DocVoice AI
                            </span>
                            <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                                Smart Telegram Documents
                            </p>
                        </div>
                    </div>

                    {/* Desktop Navigation Links (Clean English) */}
                    <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
                        <button
                            onClick={() => setActiveTab('home')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                                activeTab === 'home' 
                                    ? 'bg-white text-slate-900 shadow-2xs' 
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <Home className="w-3.5 h-3.5" />
                            <span>Home</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('files')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                                activeTab === 'files' 
                                    ? 'bg-white text-slate-900 shadow-2xs' 
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5 text-blue-600" />
                            <span>My Files</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('whitelist')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                                activeTab === 'whitelist' 
                                    ? 'bg-white text-emerald-700 shadow-2xs' 
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Roles & Access</span>
                        </button>
                    </nav>

                    {/* Right action: Upload & Logout */}
                    <div className="flex items-center space-x-2">
                        {/* Upload Button */}
                        <button
                            onClick={() => onOpenUpload('file')}
                            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Upload File</span>
                        </button>

                        {/* Logout Button */}
                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className="flex items-center space-x-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition cursor-pointer text-xs font-medium"
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
