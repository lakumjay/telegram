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
        <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Brand */}
                    <div className="flex items-center space-x-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 p-2 shadow-md shadow-blue-500/20 flex items-center justify-center text-white">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-1.5">
                                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                                    DocVoice AI
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">
                                Your Smart Telegram Bot
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                        {/* Live AI Voice Call Button matching user reference */}
                        <button
                            onClick={onOpenCall}
                            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-[#2e7d32] hover:bg-[#256629] text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all transform active:scale-95 cursor-pointer"
                        >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>AI Voice Call (લાઈવ)</span>
                            <span className="text-emerald-200">›</span>
                        </button>

                        {/* Upload Button */}
                        <button
                            onClick={onOpenUpload}
                            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-sm transition cursor-pointer"
                        >
                            <UploadCloud className="w-4 h-4 text-blue-600" />
                            <span>અપલોડ</span>
                        </button>

                        {/* Logout Button */}
                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className="flex items-center space-x-1 p-2 sm:px-3 sm:py-2 rounded-2xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 shadow-sm transition cursor-pointer text-xs font-semibold"
                                title="Logout"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Tab Bar */}
            <div className="flex md:hidden items-center justify-around border-t border-slate-800 py-2 bg-slate-950 px-2">
                <button
                    onClick={() => setActiveTab('explorer')}
                    className={`flex flex-col items-center py-1 px-3 text-[11px] ${
                        activeTab === 'explorer' ? 'text-blue-400 font-semibold' : 'text-slate-400'
                    }`}
                >
                    <Layers className="w-4 h-4 mb-0.5" />
                    દસ્તાવેજો
                </button>
                <button
                    onClick={() => setActiveTab('simulator')}
                    className={`flex flex-col items-center py-1 px-3 text-[11px] ${
                        activeTab === 'simulator' ? 'text-blue-400 font-semibold' : 'text-slate-400'
                    }`}
                >
                    <MessageSquare className="w-4 h-4 mb-0.5" />
                    ચેટ બોટ
                </button>
                <button
                    onClick={() => setActiveTab('whitelist')}
                    className={`flex flex-col items-center py-1 px-3 text-[11px] ${
                        activeTab === 'whitelist' ? 'text-blue-400 font-semibold' : 'text-slate-400'
                    }`}
                >
                    <ShieldCheck className="w-4 h-4 mb-0.5" />
                    વ્હાઇટલિસ્ટ
                </button>
            </div>
        </header>
    );
}
