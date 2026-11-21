import React, { useState } from 'react';
import { 
    Search, 
    Bell, 
    Grid, 
    Building2, 
    ChevronDown, 
    User,
    Check
} from 'lucide-react';

export default function DesktopTopBar({ 
    clinics = [], 
    activeClinicId, 
    onSelectClinic, 
    onOpenProfileModal,
    onOpenNotifications,
    onSearch 
}) {
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    const activeClinic = clinics.find(c => c.id === activeClinicId) || clinics[0] || {
        id: 1,
        name: 'શ્રીરામ ક્લિનિક',
        doctor_name: 'Dr. Jay Lakum',
        qualification: 'MBBS'
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (onSearch) onSearch(searchValue);
    };

    return (
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
            
            {/* Left: Clinic Switcher Dropdown matching Desktop Screen 2 */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 flex items-center space-x-2 transition cursor-pointer"
                >
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>{activeClinic.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isSwitcherOpen && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl w-64 p-2 space-y-1 animate-in fade-in">
                        <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>Switch Clinic</span>
                            <span className="text-emerald-700">{clinics.length} Available</span>
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
                                        isCurrent ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    <span>{c.name}</span>
                                    {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Center: Global Search Bar matching Screen 2 */}
            <div className="max-w-md w-full mx-6">
                <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                    <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        placeholder="Search patients..."
                        className="w-full bg-slate-50 border border-slate-200/90 focus:border-emerald-600 focus:bg-white rounded-2xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none transition"
                    />
                </form>
            </div>

            {/* Right: Notifications, Grid & Doctor Avatar matching Screen 2 */}
            <div className="flex items-center space-x-3">
                <button
                    onClick={onOpenNotifications}
                    className="relative w-9 h-9 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 transition cursor-pointer"
                    title="Notifications"
                >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border border-white" />
                </button>

                <div 
                    onClick={onOpenProfileModal}
                    className="flex items-center space-x-2.5 pl-2 cursor-pointer group"
                    title="Edit Doctor Profile"
                >
                    <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs overflow-hidden border border-emerald-200">
                        {activeClinic?.logo_url ? (
                            <img src={activeClinic.logo_url} alt="Doctor" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-4 h-4" />
                        )}
                    </div>
                    <div className="text-left hidden xl:block">
                        <p className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-700 transition leading-tight">
                            {activeClinic.doctor_name || 'Dr. Jay Lakum'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold leading-none mt-0.5">
                            {activeClinic.qualification || 'MBBS'}
                        </p>
                    </div>
                </div>
            </div>

        </header>
    );
}
