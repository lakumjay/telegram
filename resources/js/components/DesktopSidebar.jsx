import React from 'react';
import { 
    LayoutDashboard, 
    Users, 
    Receipt, 
    Wallet, 
    Pill, 
    BarChart3, 
    FolderArchive, 
    ShieldCheck, 
    Settings, 
    LogOut,
    Stethoscope,
    Calendar
} from 'lucide-react';

export default function DesktopSidebar({ 
    activeTab, 
    setActiveTab, 
    activeClinic, 
    onLogout 
}) {
    const clinicName = activeClinic?.name || 'શ્રીરામ ક્લિનિક';
    const doctorName = activeClinic?.doctor_name || 'Dr. Jay Lakum';
    const qualification = activeClinic?.qualification || 'MBBS';

    const navItems = [
        { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'patients', label: 'Patients', icon: Users },
        { id: 'appointments', label: 'Appointments', icon: Calendar },
        { id: 'billing', label: 'Billing', icon: Receipt },
        { id: 'expenses', label: 'Expenses', icon: Wallet },
        { id: 'stock', label: 'Stock', icon: Pill },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'files', label: 'Files', icon: FolderArchive },
        { id: 'staff', label: 'Staff', icon: ShieldCheck },
        { id: 'more', label: 'Settings', icon: Settings },
    ];

    return (
        <aside className="w-60 bg-white border-r border-slate-200/80 flex flex-col justify-between p-4 flex-shrink-0 min-h-screen">
            <div className="space-y-6">
                
                {/* Logo & Doctor Header matching Desktop Screen 2 */}
                <div className="flex items-center space-x-3 px-2 py-1">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 overflow-hidden flex-shrink-0">
                        {activeClinic?.logo_url ? (
                            <img src={activeClinic.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Stethoscope className="w-5 h-5 text-white" />
                        )}
                    </div>
                    <div className="truncate">
                        <h2 className="font-black text-sm text-slate-900 tracking-tight leading-none truncate">
                            {clinicName}
                        </h2>
                        <p className="text-[11px] font-bold text-slate-400 leading-none mt-1 truncate">
                            {doctorName}, {qualification}
                        </p>
                    </div>
                </div>

                {/* Navigation Items with Emerald Highlight matching Screen 2 */}
                <nav className="space-y-1">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition active:scale-98 cursor-pointer ${
                                    isActive
                                        ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-700/20'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

            </div>

            {/* Logout at bottom matching Screen 2 */}
            <div className="pt-4 border-t border-slate-100">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
