import React from 'react';
import { 
    X, 
    ShieldCheck, 
    Layers, 
    Bot, 
    Sliders, 
    LogOut, 
    Building2, 
    ExternalLink,
    Download,
    CheckCircle2
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xs h-full p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
                
                <div className="space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2">
                            <Sliders className="w-5 h-5 text-emerald-600" />
                            <h2 className="font-extrabold text-base text-slate-900">
                                Clinic Settings & Tools
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Install App Button if available */}
                    {canInstall && (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white space-y-2 shadow-md shadow-emerald-700/20">
                            <p className="font-bold text-xs">📱 ફોનમાં એપ્લિકેશન ઇન્સ્ટોલ કરો</p>
                            <p className="text-[11px] text-emerald-100">હોમ સ્ક્રીન પરથી ડાયરેક્ટ ઓપન કરો</p>
                            <button
                                onClick={onInstallPwa}
                                className="w-full py-2 bg-white text-emerald-800 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                                <span>Install App</span>
                            </button>
                        </div>
                    )}

                    {/* Switch Clinic */}
                    {clinics.length > 1 && (
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
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
                                            <p className="leading-tight">{c.name}</p>
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

                    {/* Administration Tools (moved from main screen) */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            વહીવટી ટૂલ્સ (Admin Tools)
                        </label>

                        <div className="space-y-1">
                            <button
                                onClick={() => {
                                    onNavigate('files');
                                    onClose();
                                }}
                                className="w-full p-2.5 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 transition"
                            >
                                <Layers className="w-4 h-4 text-blue-600" />
                                <span>My Files & Documents Archive</span>
                            </button>

                            <button
                                onClick={() => {
                                    onNavigate('whitelist');
                                    onClose();
                                }}
                                className="w-full p-2.5 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 transition"
                            >
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                <span>Roles & Staff Permissions</span>
                            </button>

                            <button
                                onClick={() => {
                                    onNavigate('simulator');
                                    onClose();
                                }}
                                className="w-full p-2.5 rounded-xl text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 transition"
                            >
                                <Bot className="w-4 h-4 text-indigo-600" />
                                <span>Telegram Bot Simulator</span>
                            </button>
                        </div>
                    </div>

                </div>

                {/* Logout Button */}
                <div className="pt-4 border-t border-slate-100">
                    <button
                        onClick={onLogout}
                        className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center justify-center space-x-2"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                </div>

            </div>
        </div>
    );
}
