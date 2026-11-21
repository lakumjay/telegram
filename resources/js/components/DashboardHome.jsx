import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Users, 
    IndianRupee, 
    Calendar, 
    TrendingUp, 
    TrendingDown,
    Plus, 
    Camera, 
    Receipt, 
    Wallet, 
    Clock, 
    PhoneCall, 
    Phone,
    Eye, 
    ChevronRight, 
    Sparkles,
    Bot,
    ArrowUpRight,
    Search,
    Stethoscope,
    RefreshCw,
    CheckCircle2,
    Clock3
} from 'lucide-react';

export default function DashboardHome({ 
    activeClinic,
    clinics = [],
    onNavigate,
    onOpenVoiceCall,
    onOpenScan,
    onOpenNewBill,
    onOpenNewPatient,
    onOpenAddExpense
}) {
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [activeClinic?.id]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const clinicId = activeClinic?.id || 1;
            const res = await axios.get(`/api/clinic-accounts/summary?clinic_id=${clinicId}`);
            if (res.data?.success) {
                setSummary(res.data);
            }
        } catch (err) {
            console.error('Error fetching dashboard summary:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const doctorName = activeClinic?.doctor_name || 'Dr. Jay Lakum';
    const clinicName = activeClinic?.name || 'શ્રીરામ ક્લિનિક';
    const qualification = activeClinic?.qualification || 'MBBS';

    const todayPatients = summary?.today?.patients_count ?? 24;
    const todayIncome = summary?.today?.income ? Number(summary.today.income).toLocaleString('en-IN') : '8,250';
    const todayExpenses = summary?.today?.expense ? Number(summary.today.expense).toLocaleString('en-IN') : '1,250';
    const netProfit = summary?.today?.net_profit ? Number(summary.today.net_profit).toLocaleString('en-IN') : '7,000';
    const monthlyProfit = summary?.month?.net_profit ? Number(summary.month.net_profit).toLocaleString('en-IN') : '1,25,000';
    const appointmentsCount = summary?.appointments_count ?? 6;

    const recentPatients = summary?.recent_patients || [
        { id: 1, name: 'Rakesh Patel', phone: '9876543210', last_visit_date: '21-11-2026', status: 'Paid' },
        { id: 2, name: 'Hetal Sharma', phone: '9824512345', last_visit_date: '21-11-2026', status: 'Pending' },
        { id: 3, name: 'Nitesh Parmar', phone: '9574456789', last_visit_date: '20-11-2026', status: 'Paid' },
        { id: 4, name: 'Pooja Desai', phone: '9891234567', last_visit_date: '19-11-2026', status: 'Paid' },
        { id: 5, name: 'Jayesh Solanki', phone: '9724567890', last_visit_date: '18-11-2026', status: 'Paid' }
    ];

    // Gujarati formatted greeting date
    const todayDateStr = "Mon, 21 Nov 2026";
    const gujaratiTithi = "કારતક સુદ - ૧૦";

    return (
        <div className="space-y-4 sm:space-y-6">
            
            {/* 1. WELCOME BANNER (Mobile & Desktop Responsive matching Screen 1 & 2) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-100/50 border border-emerald-100/80 p-4 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between relative z-10">
                    <div className="space-y-1 sm:space-y-1.5 max-w-lg">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                                Good Morning, {doctorName}! <span className="inline-block animate-bounce">☀️</span>
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Here's what's happening at {clinicName} today. Have a great day ahead!
                        </p>
                    </div>

                    {/* Right side Date badge & Doctor / Stethoscope avatar art */}
                    <div className="flex items-center space-x-4">
                        <div className="hidden sm:block text-right bg-white/80 backdrop-blur-xs px-3.5 py-2 rounded-2xl border border-emerald-100 shadow-2xs">
                            <p className="font-extrabold text-xs text-slate-800">{todayDateStr}</p>
                            <p className="text-[11px] font-bold text-emerald-700">{gujaratiTithi}</p>
                        </div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-emerald-200/80 shadow-xs flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                            {activeClinic?.logo_url ? (
                                <img src={activeClinic.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <div className="w-full h-full rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                                    <Stethoscope className="w-7 h-7" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. 4 METRIC CARDS (2x2 Grid on Mobile, 4-col on Desktop) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* Card 1: Today Patients */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-slate-100 shadow-2xs hover:shadow-xs transition space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" /> +12%
                        </span>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400">Today Patients</p>
                        <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{todayPatients}</p>
                    </div>
                </div>

                {/* Card 2: Today Income */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-slate-100 shadow-2xs hover:shadow-xs transition space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" /> +15%
                        </span>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400">Today Income</p>
                        <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">₹{todayIncome}</p>
                    </div>
                </div>

                {/* Card 3: Today Expenses / Appointments */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-slate-100 shadow-2xs hover:shadow-xs transition space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">
                            Today
                        </span>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400">Appointments</p>
                        <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{appointmentsCount}</p>
                    </div>
                </div>

                {/* Card 4: Monthly Profit / Net Profit */}
                <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border border-slate-100 shadow-2xs hover:shadow-xs transition space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" /> +18%
                        </span>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400">Monthly Profit</p>
                        <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">₹{monthlyProfit}</p>
                    </div>
                </div>

            </div>

            {/* 3. QUICK ACTIONS (6 Action Buttons matching Mobile Screen 1) */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">
                        Quick Actions
                    </h3>
                    <button 
                        onClick={() => onNavigate('patients')}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5"
                    >
                        View All <ChevronRight className="w-3 h-3" />
                    </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
                    
                    {/* Action 1: New Patient */}
                    <button
                        onClick={onOpenNewPatient}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-100/60 transition active:scale-95 group text-center"
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-1.5">
                            <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">New Patient</span>
                    </button>

                    {/* Action 2: Scan Prescription */}
                    <button
                        onClick={onOpenScan}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/60 hover:bg-blue-100/70 border border-blue-100/60 transition active:scale-95 group text-center"
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-1.5">
                            <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">Scan Prescription</span>
                    </button>

                    {/* Action 3: New Bill */}
                    <button
                        onClick={onOpenNewBill}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-orange-50/60 hover:bg-orange-100/70 border border-orange-100/60 transition active:scale-95 group text-center"
                    >
                        <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-1.5">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">New Bill</span>
                    </button>

                    {/* Action 4: Add Expense */}
                    <button
                        onClick={onOpenAddExpense}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-50/60 hover:bg-purple-100/70 border border-purple-100/60 transition active:scale-95 group text-center"
                    >
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-1.5">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">Add Expense</span>
                    </button>

                    {/* Action 5: Patient History */}
                    <button
                        onClick={() => onNavigate('patients')}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-cyan-50/60 hover:bg-cyan-100/70 border border-cyan-100/60 transition active:scale-95 group text-center"
                    >
                        <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-1.5">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">Patient History</span>
                    </button>

                    {/* Action 6: AI Voice Call */}
                    <button
                        onClick={onOpenVoiceCall}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-teal-50/60 hover:bg-teal-100/70 border border-teal-100/60 transition active:scale-95 group text-center"
                    >
                        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-1.5">
                            <PhoneCall className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">AI Voice Call</span>
                    </button>

                </div>
            </div>

            {/* 4. MAIN TWO-COLUMN SECTION (Desktop: Recent Patients Table + Quick Summary Sidebar) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                
                {/* Left 2 Columns: Recent Patients */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2">
                            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">
                                Recent Patients
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {recentPatients.length} Recent
                            </span>
                        </div>
                        <button 
                            onClick={() => onNavigate('patients')}
                            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5"
                        >
                            View All <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>

                    {/* Mobile View: Clean Card List */}
                    <div className="space-y-2 sm:hidden">
                        {recentPatients.map(pt => (
                            <div key={pt.id} className="p-3 rounded-2xl border border-slate-100 hover:border-emerald-200 transition bg-slate-50/40 flex items-center justify-between">
                                <div className="flex items-center space-x-2.5">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-800 font-bold text-xs flex items-center justify-center">
                                        {pt.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-xs text-slate-900">{pt.name}</p>
                                        <p className="text-[10px] text-slate-400">{pt.phone} • {pt.last_visit_date}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                        pt.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                    }`}>
                                        {pt.status}
                                    </span>
                                    <a
                                        href={`tel:${pt.phone}`}
                                        className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center hover:bg-emerald-100"
                                    >
                                        <Phone className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop View: Rich Table matching Screen 2 */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="text-slate-400 font-bold border-b border-slate-100 text-[11px]">
                                    <th className="pb-2.5">Patient Name</th>
                                    <th className="pb-2.5">Mobile</th>
                                    <th className="pb-2.5">Visit Date</th>
                                    <th className="pb-2.5">Status</th>
                                    <th className="pb-2.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentPatients.map(pt => (
                                    <tr key={pt.id} className="hover:bg-slate-50/60 transition">
                                        <td className="py-2.5 font-bold text-slate-800 flex items-center space-x-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center">
                                                {pt.name.charAt(0)}
                                            </div>
                                            <span>{pt.name}</span>
                                        </td>
                                        <td className="py-2.5 text-slate-500 font-medium">{pt.phone}</td>
                                        <td className="py-2.5 text-slate-500 font-medium">{pt.last_visit_date}</td>
                                        <td className="py-2.5">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                pt.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                            }`}>
                                                {pt.status}
                                            </span>
                                        </td>
                                        <td className="py-2.5 text-right">
                                            <div className="flex items-center justify-end space-x-1.5">
                                                <a 
                                                    href={`tel:${pt.phone}`}
                                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                                                    title="Call Patient"
                                                >
                                                    <Phone className="w-3.5 h-3.5" />
                                                </a>
                                                <button 
                                                    onClick={() => onNavigate('patients')}
                                                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>

                {/* Right Column: Quick Summary & AI Voice Call Robot Card (Desktop Screen 2) */}
                <div className="space-y-4">
                    
                    {/* Quick Monthly Summary */}
                    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">
                                Quick Summary
                            </h3>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                This Month
                            </span>
                        </div>

                        <div className="space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Total Patients
                                </span>
                                <span className="font-bold text-slate-900">324</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Total Bills
                                </span>
                                <span className="font-bold text-slate-900">₹1,85,000</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500" /> Total Expenses
                                </span>
                                <span className="font-bold text-slate-900">₹65,000</span>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-extrabold">
                                <span className="text-emerald-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-600" /> Monthly Profit
                                </span>
                                <span className="text-emerald-700 text-sm">₹1,20,000</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Voice Call Robot Promo Card matching Screen 2 */}
                    <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-4 sm:p-5 text-white shadow-xs relative overflow-hidden space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="font-extrabold text-sm flex items-center gap-1.5">
                                    <Bot className="w-4 h-4 text-emerald-200" /> AI Voice Call
                                </p>
                                <p className="text-[11px] text-emerald-100 leading-snug">
                                    Follow-up with patients automatically in Gujarati.
                                </p>
                            </div>
                            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 text-white">
                                <Sparkles className="w-6 h-6 text-emerald-200" />
                            </div>
                        </div>

                        <button
                            onClick={onOpenVoiceCall}
                            className="w-full py-2 bg-white text-emerald-800 font-extrabold text-xs rounded-xl shadow-xs hover:bg-emerald-50 active:scale-95 transition cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                            <span>Start Call</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                </div>

            </div>

        </div>
    );
}
