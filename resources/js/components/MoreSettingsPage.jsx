import React from 'react';
import { 
    ArrowLeft, 
    User, 
    Building2, 
    Layers, 
    FolderArchive, 
    Users, 
    Bot, 
    MessageSquare, 
    Bell, 
    ShieldCheck, 
    LogOut, 
    ChevronRight, 
    Stethoscope,
    Download
} from 'lucide-react';

export default function MoreSettingsPage({ 
    activeClinic, 
    onBack, 
    onOpenProfileModal, 
    onOpenNotifications,
    onNavigate, 
    onLogout,
    canInstall,
    onInstallPwa
}) {
    const doctorName = activeClinic?.doctor_name || 'Dr. Jay Lakum';
    const qualification = activeClinic?.qualification || 'MBBS, MD';
    const clinicName = activeClinic?.name || 'શ્રીરામ ક્લિનિક';

    const menuItems = [
        {
            id: 'clinic-settings',
            title: 'Clinic Settings',
            desc: 'ક્લિનિક પ્રોફાઇલ, લોગો અને ઓપીડી ફી',
            icon: Stethoscope,
            color: 'bg-emerald-50 text-emerald-600',
            action: () => onOpenProfileModal()
        },
        {
            id: 'multi-clinic',
            title: 'Multi-Clinic Management',
            desc: 'બધા ક્લિનિક્સ મેનેજ કરો',
            icon: Building2,
            color: 'bg-teal-50 text-teal-600',
            action: () => onOpenProfileModal()
        },
        {
            id: 'files',
            title: 'My Files & Documents',
            desc: 'પ્રિસ્ક્રિપ્શન, લેબ રિપોર્ટ્સ અને પીડીએફ',
            icon: FolderArchive,
            color: 'bg-blue-50 text-blue-600',
            action: () => onNavigate('files')
        },
        {
            id: 'staff',
            title: 'Staff & Permissions',
            desc: 'કમ્પાઉન્ડર અને રિસેપ્શનિસ્ટ એક્સેસ',
            icon: Users,
            color: 'bg-purple-50 text-purple-600',
            action: () => onNavigate('whitelist')
        },
        {
            id: 'ai-voice',
            title: 'AI Voice Settings',
            desc: 'ગુજરાતી AI કૉલિંગ એજન્ટ અને વોઇસ',
            icon: Bot,
            color: 'bg-cyan-50 text-cyan-600',
            action: () => onNavigate('simulator')
        },
        {
            id: 'telegram',
            title: 'Telegram Bot Settings',
            desc: 'ટેલિગ્રામ ઓટો-પ્રિસ્ક્રિપ્શન સિન્ક',
            icon: MessageSquare,
            color: 'bg-indigo-50 text-indigo-600',
            action: () => onNavigate('simulator')
        },
        {
            id: 'notifications',
            title: 'Notification Settings',
            desc: 'એસએમએસ, વોટ્સએપ અને એલર્ટ્સ',
            icon: Bell,
            color: 'bg-amber-50 text-amber-600',
            action: () => {
                if (onOpenNotifications) onOpenNotifications();
            }
        },
        {
            id: 'security',
            title: 'Security Settings',
            desc: 'સુરક્ષા અને 2FA સેટિંગ્સ',
            icon: ShieldCheck,
            color: 'bg-rose-50 text-rose-600',
            action: () => onNavigate('staff')
        }
    ];

    return (
        <div className="max-w-xl mx-auto space-y-4 pb-20">
            
            {/* Header matching Screen 6 with Working Back AND Close Buttons */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={onBack}
                        className="w-9 h-9 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
                        title="Back to Home"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h2 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                            More Settings
                        </h2>
                        <p className="text-[11px] text-slate-400 font-medium">
                            Clinic Settings & Administrative Tools
                        </p>
                    </div>
                </div>

                {/* Explicit Close Button for Mobile */}
                <button
                    onClick={onBack}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center space-x-1 cursor-pointer"
                >
                    <span>Home</span>
                </button>
            </div>

            {/* Doctor Profile Card matching Screen 6 */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md overflow-hidden border border-emerald-400/30 flex-shrink-0">
                        {activeClinic?.logo_url ? (
                            <img src={activeClinic.logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-7 h-7" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                            {doctorName}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 mt-0.5">
                            {qualification} • {clinicName}
                        </p>
                        <button
                            onClick={onOpenProfileModal}
                            className="text-[11px] font-extrabold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5 mt-1 cursor-pointer"
                        >
                            Edit Profile <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Install App Banner if available */}
            {canInstall && (
                <div className="p-4 rounded-3xl bg-slate-900 text-white flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
                            <Download className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="font-bold text-xs">ફોનમાં એપ ઇન્સ્ટોલ કરો</p>
                            <p className="text-[10px] text-slate-400">૧-ટેપ હોમ સ્ક્રીન શોર્ટકટ</p>
                        </div>
                    </div>
                    <button
                        onClick={onInstallPwa}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                        Install
                    </button>
                </div>
            )}

            {/* Menu List matching Screen 6 */}
            <div className="bg-white rounded-3xl p-2 sm:p-3 border border-slate-200/80 shadow-xs divide-y divide-slate-100">
                {menuItems.map(item => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.id}
                            onClick={item.action}
                            className="p-3 rounded-2xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between group"
                        >
                            <div className="flex items-center space-x-3">
                                <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-800 transition">
                                        {item.title}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                        </div>
                    );
                })}

                {/* Logout Option matching Screen 6 */}
                <div
                    onClick={onLogout}
                    className="p-3 rounded-2xl hover:bg-rose-50 transition cursor-pointer flex items-center justify-between group text-rose-600"
                >
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                            <LogOut className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="font-bold text-xs sm:text-sm text-rose-600">
                                Logout
                            </p>
                            <p className="text-[10px] text-rose-400">
                                એકાઉન્ટમાંથી બહાર નીકળો
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-rose-300 group-hover:translate-x-0.5 transition" />
                </div>
            </div>

        </div>
    );
}
