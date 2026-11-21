import React from 'react';
import { 
    X, 
    ShieldCheck, 
    Layers, 
    Bot, 
    Sliders, 
    LogOut, 
    Building2, 
    Download,
    CheckCircle2,
    ChevronRight,
    HelpCircle,
    User
} from 'lucide-react';

export default function MoreSettingsDrawer({ 
    isOpen, 
    onClose, 
    clinics = [], 
    activeClinicId, 
    onSelectClinic, 
    onNavigate,
    onInstallPwa,
    canInstall,
    onLogout
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-xs h-full p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
                
                <div className="space-y-5">
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                                <Sliders className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="font-extrabold text-sm text-slate-900 leading-tight">
                                    Clinic Settings & Tools
                                </h2>
                                <p className="text-[10px] text-slate-400">વધારાના ટૂલ્સ & એકાઉન્ટ</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Install App Banner inside drawer */}
                    {canInstall && (
                        <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2 shadow-xs">
                            <div className="flex items-center space-x-2">
                                <Download className="w-4 h-4 text-emerald-400" />
                                <p className="font-bold text-xs">ફોનમાં એપ ઇન્સ્ટોલ કરો</p>
                            </div>
                            <p className="text-[11px] text-slate-300">હોમ સ્ક્રીન પરથી ૧-ક્લિકમાં ઓપન કરો</p>
                            <button
                                onClick={onInstallPwa}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
                            >
                                Install App Now
                            </button>
                        </div>
                    )}

                    {/* Switch Clinic */}
                    {clinics.length > 1 && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                ક્લિનિક સ્વિચર (Switch Clinic)
                            </label>
                            <div className="space-y-1.5">
                                {clinics.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => {
                                            onSelectClinic(c.id);
                                            onClose();
                                        }}
                                        className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition flex items-center justify-between ${
                                            c.id === activeClinicId 
                                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className="truncate">
                                            <p className="leading-tight truncate">{c.name}</p>
                                            <p className="text-[10px] text-slate-400 font-normal">{c.doctor_name}</p>
                                        </div>
                                        {c.id === activeClinicId && (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Clean Administration Tools List (Balanced Alignment) */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            વહીવટી ટૂલ્સ (Admin Tools)
                        </label>

                        <div className="space-y-1">
                            <button
                                onClick={() => {
                                    onNavigate('files');
                                    onClose();
                                }}
                                className="w-full p-2.5 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between transition group"
                            >
                                <div className="flex items-center space-x-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Layers className="w-3.5 h-3.5" />
                                    </div>
                                    <span>My Files & Documents Archive</span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                            </button>

                            <button
                                onClick={() => {
                                    onNavigate('whitelist');
                                    onClose();
                                }}
                                className="w-full p-2.5 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between transition group"
                            >
                                <div className="flex items-center space-x-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                    </div>
                                    <span>Roles & Staff Permissions</span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                            </button>

                            <button
                                onClick={() => {
                                    onNavigate('simulator');
                                    onClose();
                                }}
                                className="w-full p-2.5 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between transition group"
                            >
                                <div className="flex items-center space-x-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <Bot className="w-3.5 h-3.5" />
                                    </div>
                                    <span>Telegram Bot Simulator</span>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                            </button>
                        </div>
                    </div>

                </div>

                {/* Logout Button */}
                <div className="pt-4 border-t border-slate-100">
                    <button
                        onClick={onLogout}
                        className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold transition flex items-center justify-center space-x-2"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                </div>

            </div>
        </div>
    );
}
