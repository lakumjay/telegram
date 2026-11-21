import React, { useState } from 'react';
import { 
    X, 
    Bell, 
    AlertTriangle, 
    CheckCircle2, 
    Receipt, 
    Pill, 
    MessageSquare, 
    Clock, 
    ChevronRight,
    Trash2
} from 'lucide-react';

export default function NotificationModal({ 
    isOpen, 
    onClose, 
    onNavigate,
    activeClinic
}) {
    if (!isOpen) return null;

    const [notifications, setNotifications] = useState([
        {
            id: 1,
            title: 'દવાઓનો સ્ટોક ઓછો છે (Low Stock Alert)',
            desc: 'Paracetamol 650mg અને Amoxicillin નો સ્ટોક ૧૦ કરતાં ઓછો છે. નવો ઓર્ડર કરો.',
            time: 'આજે',
            icon: Pill,
            color: 'bg-rose-50 text-rose-600 border-rose-200',
            actionTab: 'stock',
            isRead: false
        },
        {
            id: 2,
            title: 'આજના દર્દીઓ અને વિઝિટ',
            desc: `${activeClinic?.name || 'શ્રીરામ ક્લિનિક'} માં આજે ૨૪ દર્દીઓની તપાસ પૂર્ણ થઈ ગઈ છે.`,
            time: 'આજે',
            icon: CheckCircle2,
            color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            actionTab: 'patients',
            isRead: false
        },
        {
            id: 3,
            title: 'બાકી પેમેન્ટ (Pending Bills)',
            desc: 'Hetal Sharma નું ₹૧,૪૫૦ નું ઓપીડી બિલ પેન્ડિંગ છે.',
            time: 'ગઈકાલે',
            icon: Receipt,
            color: 'bg-amber-50 text-amber-600 border-amber-200',
            actionTab: 'billing',
            isRead: false
        },
        {
            id: 4,
            title: 'ટેલિગ્રામ બોટ સિન્ક સક્રિય છે',
            desc: 'ટેલિગ્રામ પર મોકલેલા પ્રિસ્ક્રિપ્શન આપમેળે સિન્ક થઈ રહ્યા છે.',
            time: 'ચાલુ',
            icon: MessageSquare,
            color: 'bg-blue-50 text-blue-600 border-blue-200',
            actionTab: 'simulator',
            isRead: true
        }
    ]);

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const handleClearAll = () => {
        setNotifications([]);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] my-4 animate-in fade-in zoom-in-95 space-y-3">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                                નોટિફિકેશન્સ (Notifications)
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium">
                                ક્લિનિક એલર્ટ્સ અને રિમાઇન્ડર
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition active:scale-90 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Quick Action toolbar */}
                {notifications.length > 0 && (
                    <div className="flex items-center justify-between px-1 text-xs">
                        <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="text-[11px] font-bold text-emerald-700 hover:underline"
                        >
                            બધા વાંચેલા માર્ક કરો
                        </button>
                        <button
                            type="button"
                            onClick={handleClearAll}
                            className="text-[11px] font-bold text-slate-400 hover:text-rose-600"
                        >
                            બધા હટાવો
                        </button>
                    </div>
                )}

                {/* Notification list */}
                <div className="overflow-y-auto flex-1 space-y-2.5 pr-0.5">
                    {notifications.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 space-y-2">
                            <Bell className="w-8 h-8 mx-auto text-slate-300" />
                            <p className="text-xs font-bold">કોઈ નવી નોટિફિકેશન નથી.</p>
                            <p className="text-[10px]">બધા ક્લિનિક એલર્ટ્સ ક્લિયર છે.</p>
                        </div>
                    ) : (
                        notifications.map(n => {
                            const Icon = n.icon;
                            return (
                                <div
                                    key={n.id}
                                    onClick={() => {
                                        if (onNavigate && n.actionTab) {
                                            onNavigate(n.actionTab);
                                            onClose();
                                        }
                                    }}
                                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-start space-x-3 group ${
                                        n.isRead 
                                            ? 'bg-slate-50/60 border-slate-100 opacity-75' 
                                            : 'bg-white border-slate-200/90 hover:border-emerald-300 shadow-2xs'
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl ${n.color} border flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 space-y-0.5">
                                        <div className="flex items-center justify-between">
                                            <p className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-700 transition">
                                                {n.title}
                                            </p>
                                            <span className="text-[10px] text-slate-400 font-bold">{n.time}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 leading-snug">
                                            {n.desc}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition flex-shrink-0 mt-2" />
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer close */}
                <div className="pt-2 border-t border-slate-100 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                    >
                        બંધ કરો (Close)
                    </button>
                </div>

            </div>
        </div>
    );
}
