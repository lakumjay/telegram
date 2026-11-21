import React from 'react';
import { 
    Stethoscope, 
    MoreVertical, 
    ChevronDown, 
    Layers, 
    ShieldCheck, 
    Sliders, 
    LogOut, 
    FileText, 
    Bot,
    Plus
} from 'lucide-react';

export default function MobileHeader({ 
    clinics = [], 
    activeClinicId, 
    onSelectClinic, 
    onOpenMoreMenu,
    onOpenVoiceCall,
    onOpenProfileModal
}) {
    const activeClinic = clinics.find(c => c.id === activeClinicId) || clinics[0] || {
        name: 'શ્રીરામ ક્લિનિક',
        doctor_name: 'Dr. Jay Lakum'
    };

    return (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-2xs">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
                
                {/* Doctor Clinic Profile & Custom Logo (Clickable to edit profile) */}
                <div 
                    onClick={onOpenProfileModal}
                    className="flex items-center space-x-3 cursor-pointer group"
                    title="ક્લિનિક પ્રોફાઇલ અને લોગો સેટ કરો"
                >
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 flex-shrink-0 overflow-hidden border border-emerald-500/20">
                        {activeClinic.logo_url ? (
                            <img src={activeClinic.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Stethoscope className="w-5 h-5" />
                        )}
                    </div>
                    
                    <div>
                        <div className="flex items-center space-x-1.5">
                            <h1 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight leading-none group-hover:text-emerald-700 transition">
                                {activeClinic.name}
                            </h1>
                            <span className="text-[10px] bg-slate-100 group-hover:bg-emerald-50 text-slate-500 group-hover:text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                Edit
                            </span>
                        </div>
                        <p className="text-[11px] font-semibold text-emerald-700 leading-none mt-1">
                            {activeClinic.doctor_name || 'Dr. Jay'} {activeClinic.qualification ? `(${activeClinic.qualification})` : ''}
                        </p>
                    </div>
                </div>

                {/* Right side: 3-Dots More Settings Menu Button */}
                <div className="flex items-center space-x-1">
                    <button
                        onClick={onOpenMoreMenu}
                        className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95 cursor-pointer"
                        title="More Clinic Settings"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    );
}
