import React, { useState } from 'react';
import { 
    Stethoscope, 
    Bell, 
    ChevronDown, 
    Building2, 
    User,
    Check,
    Plus
} from 'lucide-react';

export default function MobileHeader({ 
    clinics = [], 
    activeClinicId, 
    onSelectClinic, 
    onOpenMoreMenu,
    onOpenVoiceCall,
    onOpenProfileModal,
    onOpenNotifications,
    isSuperAdmin = false
}) {
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    const formatDoctorName = (raw) => {
        if (!raw) return 'Dr. Jay Lakum';
        let clean = raw.trim();
        if (/^dr[\s\.]+/i.test(clean)) {
            clean = clean.replace(/^dr[\s\.]+/i, '');
        } else if (/^dr/i.test(clean) && clean.length > 2 && clean[2] !== ' ') {
            clean = clean.replace(/^dr/i, '');
        }
        clean = clean.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        return `Dr. ${clean}`;
    };

    const activeClinic = clinics.find(c => c.id === activeClinicId) || clinics[0] || {
        id: 1,
        name: 'શ્રીરામ ક્લિનિક',
        doctor_name: 'Dr. Jay Lakum',
        qualification: 'MBBS'
    };

    const formattedDoctorName = formatDoctorName(activeClinic.doctor_name);

    return (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-2.5 shadow-2xs">
            <div className="max-w-6xl mx-auto space-y-2">
                
                {/* Top Row: Logo + Clinic & Doctor Name + Notification Bell & Avatar */}
                <div className="flex items-center justify-between">
                    
                    {/* Doctor Clinic Profile & Custom Logo */}
                    <div 
                        onClick={onOpenProfileModal}
                        className="flex items-center space-x-2.5 cursor-pointer group"
                        title="Edit Doctor Profile"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 flex-shrink-0 overflow-hidden border border-emerald-500/30">
                            {activeClinic.logo_url ? (
                                <img src={activeClinic.logo_url} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <Stethoscope className="w-5 h-5 text-white" />
                            )}
                        </div>
                        
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h1 className="font-black text-sm sm:text-base text-slate-900 tracking-tight leading-none group-hover:text-emerald-700 transition">
                                    {activeClinic.name}
                                </h1>
                                {isSuperAdmin && (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                        👑 Super Admin
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 leading-none mt-1">
                                {formattedDoctorName}{activeClinic.qualification ? `, ${activeClinic.qualification}` : ', MBBS'}
                            </p>
                        </div>
                    </div>

                    {/* Right side: Notification Bell with Badge & Profile Avatar */}
                    <div className="flex items-center space-x-2.5">
                        
                        {/* Notification Bell matching Screen 1 */}
                        <button
                            type="button"
                            onClick={onOpenNotifications}
                            className="relative w-9 h-9 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 transition active:scale-95 cursor-pointer"
                            title="Notifications"
                        >
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border border-white" />
                        </button>

                        {/* Doctor Avatar matching Screen 1 with online dot */}
                        <div 
                            onClick={onOpenProfileModal}
                            className="relative w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0"
                            title="Doctor Profile"
                        >
                            {activeClinic.logo_url ? (
                                <img src={activeClinic.logo_url} alt="Doctor" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-5 h-5 text-emerald-700" />
                            )}
                            <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                        </div>

                    </div>
                </div>

                {/* Bottom Row: Clinic Switcher Dropdown Pill matching Screen 1 */}
                <div className="relative">
                    {isSuperAdmin ? (
                        <button
                            type="button"
                            onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-700 flex items-center space-x-1.5 transition active:scale-[0.98] cursor-pointer"
                        >
                            <Building2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{activeClinic.name}</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>
                    ) : (
                        <div className="inline-flex items-center space-x-1.5 bg-slate-50 border border-slate-200/90 rounded-xl px-2.5 py-1 text-[11px] font-bold text-slate-700">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{activeClinic.name}</span>
                        </div>
                    )}

                    {/* Switcher Dropdown Menu */}
                    {isSuperAdmin && isSwitcherOpen && (
                        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl w-64 p-2 space-y-1 animate-in fade-in">
                            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                <span>ક્લિનિક પસંદ કરો</span>
                                <span className="text-emerald-700">{clinics.length} ઉપલબ્ધ</span>
                            </div>

                            {clinics.map(c => {
                                const isCurrent = c.id === activeClinic.id;
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            onSelectClinic(c.id);
                                            setIsSwitcherOpen(false);
                                        }}
                                        className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition text-xs font-bold ${
                                            isCurrent 
                                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60' 
                                                : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2 truncate">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                                                {c.name.charAt(0)}
                                            </div>
                                            <span className="truncate">{c.name}</span>
                                        </div>
                                        {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                    </div>
                                );
                            })}

                            <div className="pt-1 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSwitcherOpen(false);
                                        onOpenProfileModal();
                                    }}
                                    className="w-full py-1.5 text-center text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
                                >
                                    + નવી ક્લિનિક પ્રોફાઇલ ઉમેરો
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </header>
    );
}
