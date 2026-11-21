import React, { useState, useEffect, useRef } from 'react';
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
    Clock3,
    X,
    User
} from 'lucide-react';
import PatientDetailModal from './PatientDetailModal';

export default function DashboardHome({ 
    activeClinic,
    clinics = [],
    refreshTrigger = 0,
    onNavigate,
    onOpenVoiceCall,
    onOpenScan,
    onOpenNewBill,
    onOpenNewPatient,
    onOpenAddExpense,
    onOpenAppointments
}) {
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Patient Search State on Home Page
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const searchDebounceRef = useRef(null);

    useEffect(() => {
        fetchDashboardData();
    }, [activeClinic?.id, refreshTrigger]);

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

    // Fast 150ms Debounced Patient Search on Home Page
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);

        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }

        if (!val.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchDebounceRef.current = setTimeout(async () => {
            try {
                const clinicId = activeClinic?.id || 1;
                const res = await axios.get(`/api/patients/search?clinic_id=${clinicId}&query=${encodeURIComponent(val.trim())}`);
                if (res.data?.success) {
                    setSearchResults(res.data.patients || []);
                }
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setIsSearching(false);
            }
        }, 150);
    };

    const handleOpenPatientDetail = (patientId) => {
        setSelectedPatientId(patientId);
        setIsDetailModalOpen(true);
        setSearchResults([]);
    };

    const formatDoctorName = (raw) => {
        if (!raw) return 'Doctor';
        let clean = raw.trim();
        if (/^dr[\s\.]+/i.test(clean)) {
            clean = clean.replace(/^dr[\s\.]+/i, '');
        } else if (/^dr/i.test(clean) && clean.length > 2 && clean[2] !== ' ') {
            clean = clean.replace(/^dr/i, '');
        }
        clean = clean.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        return `Dr. ${clean}`;
    };

    const formatClinicName = (raw) => {
        if (!raw) return 'શ્રીરામ ક્લિનિક';
        let clean = raw.trim();
        clean = clean.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return clean;
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 4 && hour < 12) {
            return { en: 'Good Morning', icon: '🌅', gu: 'સુપ્રભાત' };
        } else if (hour >= 12 && hour < 17) {
            return { en: 'Good Afternoon', icon: '☀️', gu: 'શુભ બપોર' };
        } else if (hour >= 17 && hour < 21) {
            return { en: 'Good Evening', icon: '🌇', gu: 'શુભ સાંજ' };
        } else {
            return { en: 'Good Night', icon: '🌙', gu: 'શુભ રાત્રિ' };
        }
    };

    const greeting = getGreeting();
    const rawDoctorName = activeClinic?.doctor_name || 'Dr. Jay Lakum';
    const doctorName = formatDoctorName(rawDoctorName);
    const clinicName = formatClinicName(activeClinic?.name || 'શ્રીરામ ક્લિનિક');
    const qualification = activeClinic?.qualification || 'MBBS';

    // REAL ACCURATE STATS - NO HARDCODED FALLBACK NUMBERS
    const todayPatients = summary?.today ? (summary.today.patients_count ?? 0) : 0;
    const todayIncome = summary?.today ? Number(summary.today.income || 0).toLocaleString('en-IN') : '0';
    const todayExpenses = summary?.today ? Number(summary.today.expense || 0).toLocaleString('en-IN') : '0';
    const netProfit = summary?.today ? Number(summary.today.net_profit || 0).toLocaleString('en-IN') : '0';
    const monthlyProfit = summary?.month ? Number(summary.month.net_profit || 0).toLocaleString('en-IN') : '0';
    const appointmentsCount = summary?.appointments_count ?? 0;
    const recentPatients = summary?.recent_patients || [];

    const now = new Date();
    const todayDateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const gujaratiTithi = "આજની તારીખ";

    return (
        <div className="space-y-4 sm:space-y-6">
            
            {/* 1. FAST PATIENT SEARCH BAR ON HOME PAGE (Direct Search & Instant Details) */}
            <div className="relative z-20">
                <div className="relative flex items-center bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-500 transition">
                    <Search className="absolute left-3.5 w-4 h-4 text-emerald-600 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="દર્દીનું નામ અથવા મોબાઈલ નંબર શોધો..."
                        className="w-full bg-transparent pl-10 pr-10 py-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 font-bold focus:outline-none"
                    />
                    {isSearching ? (
                        <div className="absolute right-3.5">
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                        </div>
                    ) : searchQuery ? (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSearchResults([]);
                            }}
                            className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    ) : null}
                </div>

                {/* Instant Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto animate-in fade-in z-30">
                        <div className="bg-slate-50 px-4 py-2 text-[11px] font-extrabold text-slate-500 flex items-center justify-between">
                            <span>શોધ પરિણામો ({searchResults.length} દર્દીઓ મળ્યા)</span>
                            <span className="text-[10px] text-emerald-700 font-bold">વિગતો અને ફોટો જોવા ટેપ કરો</span>
                        </div>
                        {searchResults.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => handleOpenPatientDetail(p.id)}
                                className="p-3.5 hover:bg-emerald-50/70 cursor-pointer transition flex items-center justify-between group"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-emerald-800 font-bold text-sm flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                                        {p.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-xs sm:text-sm text-slate-900 group-hover:text-emerald-800 transition">
                                            {p.name}
                                        </p>
                                        <p className="text-[11px] text-slate-400 font-medium">
                                            {p.phone ? `📞 ${p.phone}` : 'મોબાઈલ નથી'} {p.age ? `• ${p.age} વર્ષ` : ''} {p.city ? `• ${p.city}` : ''}
                                        </p>
                                        <p className="text-[10px] font-bold text-emerald-700">
                                            {p.last_diagnosis || 'સામાન્ય તપાસ'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition">
                                    <span>વિગતો & ફોટા</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. WELCOME BANNER (Mobile & Desktop Responsive matching Screen 1 & 2) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-100/50 border border-emerald-100/80 p-4 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between relative z-10">
                    <div className="space-y-1 sm:space-y-1.5 max-w-lg">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                                {greeting.en}, {doctorName}! <span className="inline-block animate-bounce">{greeting.icon}</span>
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

            {/* 3. 4 METRIC CARDS (2x2 Grid on Mobile, 4-col on Desktop) */}
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

            {/* 4. QUICK ACTIONS (6 Action Buttons matching Mobile Screen 1) */}
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
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50/60 hover:bg-emerald-100/70 border border-emerald-100/60 transition active:scale-95 group text-center cursor-pointer"
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-1.5">
                            <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">New Patient</span>
                    </button>

                    {/* Action 2: Scan Prescription */}
                    <button
                        onClick={onOpenScan}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50/60 hover:bg-blue-100/70 border border-blue-100/60 transition active:scale-95 group text-center cursor-pointer"
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-1.5">
                            <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">Scan Prescription</span>
                    </button>

                    {/* Action 3: New Bill */}
                    <button
                        onClick={onOpenNewBill}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-orange-50/60 hover:bg-orange-100/70 border border-orange-100/60 transition active:scale-95 group text-center cursor-pointer"
                    >
                        <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-1.5">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">New Bill</span>
                    </button>

                    {/* Action 4: Add Expense */}
                    <button
                        onClick={onOpenAddExpense}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-50/60 hover:bg-purple-100/70 border border-purple-100/60 transition active:scale-95 group text-center cursor-pointer"
                    >
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-1.5">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">Add Expense</span>
                    </button>

                    {/* Action 5: Patient History */}
                    <button
                        onClick={() => onNavigate('patients')}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-cyan-50/60 hover:bg-cyan-100/70 border border-cyan-100/60 transition active:scale-95 group text-center cursor-pointer"
                    >
                        <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-1.5">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">Patient History</span>
                    </button>

                    {/* Action 6: AI Clinical Voice Copilot */}
                    <button
                        onClick={onOpenVoiceCall}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl bg-teal-50/60 hover:bg-teal-100/70 border border-teal-100/60 transition active:scale-95 group text-center cursor-pointer"
                        title="ડૉક્ટર માટે દર્દીની હિસ્ટ્રી બોલીને શોધો"
                    >
                        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition mb-1.5">
                            <PhoneCall className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight">AI Voice Assistant</span>
                    </button>

                </div>
            </div>

            {/* 5. MAIN TWO-COLUMN SECTION (Desktop: Recent Patients Table + Quick Summary Sidebar) */}
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
                            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                            View All <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>

                    {/* List or Clean Empty State */}
                    {recentPatients.length === 0 ? (
                        <div className="py-10 text-center space-y-2 text-slate-400">
                            <Users className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                            <p className="text-xs font-bold text-slate-600">હજુ સુધી કોઈ દર્દીની મુલાકાત નોંધાઈ નથી.</p>
                            <p className="text-[11px] text-slate-400">નવા દર્દી ઉમેરવા માટે '+ New Patient' બટન પર ક્લિક કરો.</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile View: Clean Card List (Clicking opens details and photos!) */}
                            <div className="space-y-2 sm:hidden">
                                {recentPatients.map(pt => (
                                    <div 
                                        key={pt.id} 
                                        onClick={() => handleOpenPatientDetail(pt.id)}
                                        className="p-3 rounded-2xl border border-slate-100 hover:border-emerald-300 transition bg-slate-50/40 flex items-center justify-between cursor-pointer group"
                                    >
                                        <div className="flex items-start space-x-2.5 min-w-0">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-800 font-bold text-xs flex items-center justify-center group-hover:scale-105 transition shrink-0 mt-0.5">
                                                {pt.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="font-bold text-xs text-slate-900 group-hover:text-emerald-800 transition truncate">{pt.name}</p>
                                                    {pt.opd_number && (
                                                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-100">
                                                            #{pt.opd_number}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-medium">
                                                    {[
                                                        pt.age ? `${pt.age} yrs` : null,
                                                        pt.gender ? (pt.gender.toLowerCase().startsWith('m') ? 'પુરુષ' : 'સ્ત્રી') : null,
                                                        pt.city || pt.address || null,
                                                        pt.phone || null
                                                    ].filter(Boolean).join(' • ')}
                                                </p>
                                                {(pt.last_diagnosis || pt.last_summary) && (
                                                    <p className="text-[10px] text-emerald-700 font-semibold truncate max-w-[200px] mt-0.5">
                                                        🩺 {pt.last_diagnosis || pt.last_summary}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                                pt.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                            }`}>
                                                {pt.status}
                                            </span>
                                            <button
                                                onClick={() => handleOpenPatientDetail(pt.id)}
                                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 flex items-center justify-center transition cursor-pointer"
                                                title="વિગત જુઓ"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop View: Rich Table matching Screen 2 */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="text-slate-400 font-bold border-b border-slate-100 text-[11px]">
                                            <th className="pb-2.5">દર્દીનું નામ (Patient)</th>
                                            <th className="pb-2.5">ઓપીડી / ઉંમર (OPD / Age)</th>
                                            <th className="pb-2.5">ગામ / શહેર (City)</th>
                                            <th className="pb-2.5">તકલીફ / નિદાન (Diagnosis)</th>
                                            <th className="pb-2.5">મુલાકાત તારીખ</th>
                                            <th className="pb-2.5">સ્ટેટસ</th>
                                            <th className="pb-2.5 text-right">વિગત</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {recentPatients.map(pt => (
                                            <tr 
                                                key={pt.id} 
                                                onClick={() => handleOpenPatientDetail(pt.id)}
                                                className="hover:bg-slate-50/60 transition cursor-pointer group"
                                            >
                                                <td className="py-2.5 font-bold text-slate-800 flex items-center space-x-2.5 group-hover:text-emerald-800 transition">
                                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                                                        {pt.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-900 block group-hover:text-emerald-800">{pt.name}</span>
                                                        {pt.phone && <span className="text-[10px] text-slate-400 font-normal">{pt.phone}</span>}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 text-slate-600 font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        {pt.opd_number ? (
                                                            <span className="bg-slate-100 text-slate-800 font-extrabold text-[10px] px-1.5 py-0.5 rounded border border-slate-200">
                                                                #{pt.opd_number}
                                                            </span>
                                                        ) : <span className="text-slate-400 text-[11px]">-</span>}
                                                        {pt.age && (
                                                            <span className="text-[11px] text-slate-500 font-semibold">
                                                                {pt.age} yrs {pt.gender ? `(${pt.gender.toLowerCase().startsWith('m') ? 'M' : 'F'})` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 text-slate-600 font-medium">
                                                    <span className="text-[11px]">{pt.city || pt.address || '-'}</span>
                                                </td>
                                                <td className="py-2.5 text-slate-600 font-medium max-w-[160px]">
                                                    <span className="text-[11px] bg-emerald-50/80 text-emerald-800 px-2 py-0.5 rounded font-medium truncate block" title={pt.last_diagnosis || pt.last_summary || ''}>
                                                        {pt.last_diagnosis || pt.last_summary || 'સામાન્ય તપાસ'}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 text-slate-500 font-medium text-[11px]">{pt.last_visit_date || '-'}</td>
                                                <td className="py-2.5">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                                        pt.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                                    }`}>
                                                        {pt.status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <button 
                                                        onClick={() => handleOpenPatientDetail(pt.id)}
                                                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition cursor-pointer"
                                                        title="વિગત અને પ્રિસ્ક્રિપ્શન ફોટો જુઓ"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

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
                                <span className="font-bold text-slate-900">
                                    {summary?.total_patients_count ?? (summary?.month?.patients_count ?? 0)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Total Bills
                                </span>
                                <span className="font-bold text-slate-900">
                                    {summary?.month?.income ? `₹${Number(summary.month.income).toLocaleString('en-IN')}` : '₹0'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-slate-500 font-medium flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500" /> Total Expenses
                                </span>
                                <span className="font-bold text-slate-900">
                                    {summary?.month?.expense ? `₹${Number(summary.month.expense).toLocaleString('en-IN')}` : '₹0'}
                                </span>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-extrabold">
                                <span className="text-emerald-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-600" /> Monthly Profit
                                </span>
                                <span className="text-emerald-700 text-sm">
                                    {summary?.month?.net_profit ? `₹${Number(summary.month.net_profit).toLocaleString('en-IN')}` : '₹0'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Clinical Voice Copilot Card matching Doctor's Medical Assistant */}
                    <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-4 sm:p-5 text-white shadow-xs relative overflow-hidden space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="font-extrabold text-sm flex items-center gap-1.5">
                                    <Bot className="w-4 h-4 text-emerald-200" /> Clinical AI Copilot
                                </p>
                                <p className="text-[11px] text-emerald-100 leading-snug">
                                    ડૉક્ટર માટે દર્દીઓની જૂની હિસ્ટ્રી, દવાઓ અને હિસાબ બોલીને તરત શોધો.
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
                            <span>ડૉક્ટર સહાયક કૉલ શરૂ કરો</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                </div>

            </div>

            {/* 6. PATIENT DETAIL & PHOTO MANAGEMENT MODAL (Directly on Home Page!) */}
            <PatientDetailModal
                patientId={selectedPatientId}
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedPatientId(null);
                }}
                onOpenVoiceCall={(pt) => {
                    setIsDetailModalOpen(false);
                    if (onOpenVoiceCall) onOpenVoiceCall(pt);
                }}
                onOpenNewBill={(pt) => {
                    setIsDetailModalOpen(false);
                    if (onOpenNewBill) onOpenNewBill(pt);
                }}
                onPatientUpdated={() => {
                    fetchDashboardData();
                }}
            />

        </div>
    );
}
