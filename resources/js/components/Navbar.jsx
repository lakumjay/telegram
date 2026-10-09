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
    FolderArchive
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Brand */}
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/20">
                            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                                <Bot className="w-5 h-5 text-cyan-400 animate-pulse" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className="font-bold text-lg bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                                    DocVoice AI
                                </span>
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                                    Telegram Bot Active
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 hidden sm:block">
                                AI Document Assistant & Voice Agent (ધ્વનિ)
                            </p>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <nav className="hidden md:flex items-center space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
                        <button
                            onClick={() => setActiveTab('explorer')}
                            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                activeTab === 'explorer'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        >
                            <Layers className="w-4 h-4" />
                            <span>દસ્તાવેજ એક્સપ્લોરર</span>
                            {stats?.total_documents ? (
                                <span className="px-1.5 py-0.2 bg-slate-900/60 text-[10px] rounded-full text-blue-200">
                                    {stats.total_documents}
                                </span>
                            ) : null}
                        </button>

                        <button
                            onClick={() => setActiveTab('simulator')}
                            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                activeTab === 'simulator'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        >
                            <MessageSquare className="w-4 h-4" />
                            <span>ટેલિગ્રામ સિમ્યુલેટર</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('whitelist')}
                            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                activeTab === 'whitelist'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        >
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>સિક્યુરિટી & વ્હાઇટલિસ્ટ</span>
                        </button>
                    </nav>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2.5">
                        {/* Live AI Voice Call Button */}
                        <button
                            onClick={onOpenCall}
                            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                            <PhoneCall className="w-4 h-4 animate-bounce" />
                            <span>AI Voice Call (લાઇવ)</span>
                        </button>

                        {/* Upload Button */}
                        <button
                            onClick={onOpenUpload}
                            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
                        >
                            <UploadCloud className="w-4 h-4 text-blue-400" />
                            <span>અપલોડ</span>
                        </button>

                        {/* Settings Button */}
                        <button
                            onClick={onOpenSettings}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition cursor-pointer"
                            title="સેટિંગ્સ"
                        >
                            <Sliders className="w-4 h-4" />
                        </button>

                        {/* Logout Button */}
                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/80 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/50 transition cursor-pointer"
                                title="લૉગઆઉટ"
                            >
                                <span className="text-xs font-semibold px-1">Logout</span>
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
