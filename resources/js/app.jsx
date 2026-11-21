import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';

// Component Views
import DashboardHome from './components/DashboardHome';
import DoctorPatientManager from './components/DoctorPatientManager';
import AIPrescriptionScanner from './components/AIPrescriptionScanner';
import NewBillScreen from './components/NewBillScreen';
import ClinicBillingStockManager from './components/ClinicBillingStockManager';
import MoreSettingsPage from './components/MoreSettingsPage';
import DocumentExplorer from './components/DocumentExplorer';
import TelegramBotSimulator from './components/TelegramBotSimulator';
import SecurityWhitelist from './components/SecurityWhitelist';
import LoginScreen from './components/LoginScreen';

// Navigation & Layout
import MobileHeader from './components/MobileHeader';
import DesktopSidebar from './components/DesktopSidebar';
import DesktopTopBar from './components/DesktopTopBar';

// Modals
import DoctorProfileModal from './components/DoctorProfileModal';
import NotificationModal from './components/NotificationModal';
import VoiceCallModal from './components/VoiceCallModal';
import DocumentUploadModal from './components/DocumentUploadModal';

// Icons
import { 
    Home, 
    Users, 
    Plus, 
    Receipt, 
    Sliders, 
    Camera, 
    PhoneCall, 
    Wallet, 
    X,
    Stethoscope,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Info,
    Calendar
} from 'lucide-react';

function App() {
    const [activeTab, setActiveTab] = useState('home'); // Default directly to Home Dashboard matching Screen 1!
    const [navHistory, setNavHistory] = useState(['home']);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [appToast, setAppToast] = useState(null);
    const [openAddPatientModal, setOpenAddPatientModal] = useState(false);

    const [clinics, setClinics] = useState([]);
    const [activeClinicId, setActiveClinicId] = useState(1);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [selectedPatientForCall, setSelectedPatientForCall] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
    const [selectedPatientForBill, setSelectedPatientForBill] = useState(null);

    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [canInstall, setCanInstall] = useState(false);

    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('auth_user');
            return saved ? JSON.parse(saved) : { username: 'Dr. Jay Lakum', role: 'admin' };
        } catch(e) {
            return { username: 'Dr. Jay Lakum', role: 'admin' };
        }
    });

    const triggerHaptic = (duration = 12) => {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            try {
                window.navigator.vibrate(duration);
            } catch(e) {}
        }
    };

    useEffect(() => {
        fetchClinics();

        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setCanInstall(true);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        if (window.Telegram?.WebApp) {
            try {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
            } catch(e) {}
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const fetchClinics = async () => {
        try {
            const res = await axios.get('/api/clinic-accounts/clinics');
            if (res.data?.success) {
                setClinics(res.data.clinics || []);
                if (res.data.clinics?.length > 0) {
                    setActiveClinicId(res.data.clinics[0].id);
                }
            }
        } catch(e) {}
    };

    const navigateTo = (tab) => {
        triggerHaptic(10);
        setNavHistory(prev => (prev[prev.length - 1] === tab ? prev : [...prev, tab]));
        setActiveTab(tab);
    };

    const handleBack = () => {
        triggerHaptic(8);
        setNavHistory(prev => {
            if (prev.length > 1) {
                const next = [...prev];
                next.pop();
                const target = next[next.length - 1] || 'home';
                setActiveTab(target);
                return next;
            } else {
                setActiveTab('home');
                return ['home'];
            }
        });
    };

    useEffect(() => {
        window.showAppToast = (message, type = 'success') => {
            setAppToast({ message, type });
            setTimeout(() => {
                setAppToast(null);
            }, 3800);
        };

        window.triggerAppRefresh = () => {
            setRefreshTrigger(prev => prev + 1);
        };
    }, []);

    const handleInstallPWA = async () => {
        triggerHaptic(25);
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
            setCanInstall(false);
        }
        setDeferredPrompt(null);
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_user');
        setCurrentUser(null);
    };

    if (!currentUser) {
        return <LoginScreen onLoginSuccess={(u) => setCurrentUser(u)} />;
    }

    const activeClinic = clinics.find(c => c.id === activeClinicId) || clinics[0] || {
        id: 1,
        name: 'શ્રીરામ ક્લિનિક',
        doctor_name: 'Dr. Jay Lakum',
        qualification: 'MBBS'
    };

    return (
        <div className="min-h-screen w-full bg-[#f8fafc] text-slate-900 flex flex-col lg:flex-row selection:bg-emerald-600 selection:text-white relative">
            
            {/* FLOATING TOP APP TOAST NOTIFICATION (Appears instantly on any Save, Update, Delete) */}
            {appToast && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-sm sm:max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto">
                    <div className={`p-4 rounded-2xl shadow-2xl border-2 flex items-center justify-between space-x-3 text-white ${
                        appToast.type === 'error'
                            ? 'bg-rose-600 border-rose-400 shadow-rose-950/30'
                            : appToast.type === 'warning'
                            ? 'bg-amber-600 border-amber-400 shadow-amber-950/30'
                            : 'bg-emerald-700 border-emerald-500 shadow-emerald-950/30'
                    }`}>
                        <div className="flex items-center space-x-2.5">
                            {appToast.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                            <span className="text-xs sm:text-sm font-black tracking-wide leading-snug">{appToast.message}</span>
                        </div>
                        <button onClick={() => setAppToast(null)} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer transition">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* 1. DESKTOP SIDEBAR (Visible on 1024px+ screens matching Screen 2) */}
            <div className="hidden lg:block">
                <DesktopSidebar
                    activeTab={activeTab}
                    setActiveTab={(tab) => navigateTo(tab)}
                    activeClinic={activeClinic}
                    onLogout={handleLogout}
                />
            </div>

            {/* 2. MAIN APP CONTENT CONTAINER */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen">
                
                {/* A. MOBILE HEADER (Screen 1 & Mobile devices) */}
                <div className="block lg:hidden">
                    <MobileHeader
                        clinics={clinics}
                        activeClinicId={activeClinicId}
                        onSelectClinic={(id) => {
                            setActiveClinicId(id);
                            window.triggerAppRefresh && window.triggerAppRefresh();
                        }}
                        onOpenMoreMenu={() => navigateTo('more')}
                        onOpenVoiceCall={() => setIsCallModalOpen(true)}
                        onOpenProfileModal={() => setIsProfileModalOpen(true)}
                        onOpenNotifications={() => setIsNotificationModalOpen(true)}
                    />
                </div>

                {/* B. DESKTOP TOP BAR (Screen 2 Top Header) */}
                <div className="hidden lg:block">
                    <DesktopTopBar
                        clinics={clinics}
                        activeClinicId={activeClinicId}
                        onSelectClinic={(id) => {
                            setActiveClinicId(id);
                            window.triggerAppRefresh && window.triggerAppRefresh();
                        }}
                        onOpenProfileModal={() => setIsProfileModalOpen(true)}
                        onOpenNotifications={() => setIsNotificationModalOpen(true)}
                        onSearch={(q) => {
                            navigateTo('patients');
                        }}
                    />
                </div>

                {/* C. PAGE CONTENT AREA */}
                <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 pb-28 lg:pb-8">
                    
                    {/* Screen 1 & 2: Home Clinic Dashboard */}
                    {activeTab === 'home' && (
                        <DashboardHome
                            activeClinic={activeClinic}
                            clinics={clinics}
                            refreshTrigger={refreshTrigger}
                            onNavigate={(tab) => navigateTo(tab)}
                            onOpenVoiceCall={(pt) => {
                                setSelectedPatientForCall(pt || null);
                                setIsCallModalOpen(true);
                            }}
                            onOpenScan={() => navigateTo('scan')}
                            onOpenNewBill={(pt) => {
                                setSelectedPatientForBill(pt || null);
                                navigateTo('new-bill');
                            }}
                            onOpenNewPatient={() => {
                                setOpenAddPatientModal(true);
                                navigateTo('patients');
                            }}
                            onOpenAddExpense={() => navigateTo('expenses')}
                            onOpenAppointments={() => navigateTo('appointments')}
                        />
                    )}

                    {/* Screen 4: Patients Directory */}
                    {activeTab === 'patients' && (
                        <DoctorPatientManager
                            activeClinicId={activeClinicId}
                            refreshTrigger={refreshTrigger}
                            initialOpenAdd={openAddPatientModal}
                            onCloseAdd={() => setOpenAddPatientModal(false)}
                            onOpenVoiceCall={(pt) => {
                                setSelectedPatientForCall(pt || null);
                                setIsCallModalOpen(true);
                            }}
                            onOpenNewBill={(pt) => {
                                setSelectedPatientForBill(pt || null);
                                navigateTo('new-bill');
                            }}
                            onBack={handleBack}
                        />
                    )}

                    {/* Screen 3: AI Prescription Reader */}
                    {activeTab === 'scan' && (
                        <AIPrescriptionScanner
                            activeClinicId={activeClinicId}
                            onBack={handleBack}
                            onPatientSaved={() => {
                                window.triggerAppRefresh && window.triggerAppRefresh();
                                navigateTo('patients');
                            }}
                        />
                    )}

                    {/* Screen 5: New Bill */}
                    {activeTab === 'new-bill' && (
                        <NewBillScreen
                            activeClinic={activeClinic}
                            onBack={handleBack}
                            initialPatient={selectedPatientForBill}
                            onBillGenerated={() => {
                                window.triggerAppRefresh && window.triggerAppRefresh();
                                navigateTo('billing');
                            }}
                        />
                    )}

                    {/* Billing, Expenses, Appointments, Stock & Reports Management */}
                    {(activeTab === 'billing' || activeTab === 'expenses' || activeTab === 'appointments' || activeTab === 'stock' || activeTab === 'reports') && (
                        <ClinicBillingStockManager
                            activeClinicId={activeClinicId}
                            initialSubTab={
                                activeTab === 'expenses' ? 'expenses' :
                                activeTab === 'appointments' ? 'appointments' :
                                activeTab === 'stock' ? 'stock' :
                                activeTab === 'reports' ? 'reports' : 'billing'
                            }
                            onBack={handleBack}
                            refreshTrigger={refreshTrigger}
                        />
                    )}

                    {/* Screen 6: More Settings */}
                    {activeTab === 'more' && (
                        <MoreSettingsPage
                            activeClinic={activeClinic}
                            onBack={handleBack}
                            onOpenProfileModal={() => setIsProfileModalOpen(true)}
                            onOpenNotifications={() => setIsNotificationModalOpen(true)}
                            onNavigate={(tab) => navigateTo(tab)}
                            onLogout={handleLogout}
                            canInstall={canInstall}
                            onInstallPwa={handleInstallPWA}
                        />
                    )}

                    {/* My Files Archive */}
                    {activeTab === 'files' && (
                        <DocumentExplorer
                            onOpenUpload={() => setIsUploadModalOpen(true)}
                            onOpenCall={() => setIsCallModalOpen(true)}
                            isMyFilesPage={true}
                            onBack={handleBack}
                        />
                    )}

                    {/* Staff & Whitelist */}
                    {activeTab === 'staff' && (
                        <SecurityWhitelist
                            onBack={handleBack}
                        />
                    )}

                    {/* Telegram Simulator */}
                    {activeTab === 'simulator' && (
                        <TelegramBotSimulator
                            onOpenCall={() => setIsCallModalOpen(true)}
                            onBack={handleBack}
                        />
                    )}

                </main>
            </div>

            {/* 3. MOBILE BOTTOM NAVIGATION (Fixed bottom with Center Elevated FAB matching Screen 1) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] lg:hidden flex items-center justify-around shadow-lg">
                
                {/* 1. Home */}
                <button
                    onClick={() => navigateTo('home')}
                    className={`flex flex-col items-center justify-center w-14 py-1 transition active:scale-95 cursor-pointer ${
                        activeTab === 'home' ? 'text-emerald-700 font-extrabold' : 'text-slate-400 font-medium'
                    }`}
                >
                    <Home className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] leading-tight">Home</span>
                </button>

                {/* 2. Patients */}
                <button
                    onClick={() => navigateTo('patients')}
                    className={`flex flex-col items-center justify-center w-14 py-1 transition active:scale-95 cursor-pointer ${
                        activeTab === 'patients' ? 'text-emerald-700 font-extrabold' : 'text-slate-400 font-medium'
                    }`}
                >
                    <Users className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] leading-tight">Patients</span>
                </button>

                {/* 3. CENTER ELEVATED FLOATING ACTION BUTTON (+) matching Screen 1 */}
                <div className="relative -top-3 flex items-center justify-center">
                    <button
                        onClick={() => {
                            triggerHaptic(20);
                            setIsFabMenuOpen(!isFabMenuOpen);
                        }}
                        className={`w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-700/25 border-4 border-[#f8fafc] flex items-center justify-center cursor-pointer active:scale-90 transition ${
                            isFabMenuOpen ? 'rotate-45 bg-rose-600 shadow-rose-700/25' : ''
                        }`}
                        title="Quick Actions"
                    >
                        <Plus className="w-6 h-6 text-white stroke-[2.5]" />
                    </button>
                </div>

                {/* 4. Billing */}
                <button
                    onClick={() => navigateTo('billing')}
                    className={`flex flex-col items-center justify-center w-14 py-1 transition active:scale-95 cursor-pointer ${
                        ['billing', 'new-bill', 'expenses', 'appointments', 'stock', 'reports'].includes(activeTab) ? 'text-emerald-700 font-extrabold' : 'text-slate-400 font-medium'
                    }`}
                >
                    <Receipt className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] leading-tight">Billing</span>
                </button>

                {/* 5. More */}
                <button
                    onClick={() => navigateTo('more')}
                    className={`flex flex-col items-center justify-center w-14 py-1 transition active:scale-95 cursor-pointer ${
                        ['more', 'files', 'staff', 'simulator'].includes(activeTab) ? 'text-emerald-700 font-extrabold' : 'text-slate-400 font-medium'
                    }`}
                >
                    <Sliders className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] leading-tight">More</span>
                </button>
            </div>

            {/* 4. CENTER (+) QUICK ACTION BOTTOM SHEET MODAL */}
            {isFabMenuOpen && (
                <div 
                    onClick={() => setIsFabMenuOpen(false)}
                    className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl w-full max-w-sm p-4 pb-6 space-y-3 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-5 sm:zoom-in-95"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                                ત્વરિત એક્શન (Quick Actions)
                            </h3>
                            <button onClick={() => setIsFabMenuOpen(false)} className="p-1 text-slate-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                            {/* Scan Prescription */}
                            <button
                                onClick={() => {
                                    setIsFabMenuOpen(false);
                                    navigateTo('scan');
                                }}
                                className="p-3.5 rounded-2xl bg-blue-50/70 hover:bg-blue-100/70 border border-blue-100 text-left transition active:scale-95"
                            >
                                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
                                    <Camera className="w-4 h-4" />
                                </div>
                                <p className="font-extrabold text-xs text-slate-900">Scan Prescription</p>
                                <p className="text-[10px] text-slate-400">AI ઓટો રીડર</p>
                            </button>

                            {/* New Bill */}
                            <button
                                onClick={() => {
                                    setIsFabMenuOpen(false);
                                    navigateTo('new-bill');
                                }}
                                className="p-3.5 rounded-2xl bg-orange-50/70 hover:bg-orange-100/70 border border-orange-100 text-left transition active:scale-95"
                            >
                                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center mb-2 shadow-xs">
                                    <Receipt className="w-4 h-4" />
                                </div>
                                <p className="font-extrabold text-xs text-slate-900">New Bill</p>
                                <p className="text-[10px] text-slate-400">ઓપીડી બિલ બનાવો</p>
                            </button>

                            {/* New Patient */}
                            <button
                                onClick={() => {
                                    setIsFabMenuOpen(false);
                                    setOpenAddPatientModal(true);
                                    navigateTo('patients');
                                }}
                                className="p-3.5 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-100 text-left transition active:scale-95 cursor-pointer"
                            >
                                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs">
                                    <Users className="w-4 h-4" />
                                </div>
                                <p className="font-extrabold text-xs text-slate-900">Add Patient</p>
                                <p className="text-[10px] text-slate-400">નવો દર્દી ઉમેરો</p>
                            </button>

                            {/* Clinical Voice AI */}
                            <button
                                onClick={() => {
                                    setIsFabMenuOpen(false);
                                    setIsCallModalOpen(true);
                                }}
                                className="p-3.5 rounded-2xl bg-teal-50/70 hover:bg-teal-100/70 border border-teal-100 text-left transition active:scale-95 cursor-pointer"
                            >
                                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-2 shadow-xs">
                                    <PhoneCall className="w-4 h-4" />
                                </div>
                                <p className="font-extrabold text-xs text-slate-900">Clinical Voice AI</p>
                                <p className="text-[10px] text-teal-700 font-bold">દર્દીની હિસ્ટ્રી બોલીને શોધો</p>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. DOCTOR & CLINIC PROFILE MODAL */}
            <DoctorProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                clinic={activeClinic}
                onUpdated={(updatedClinic) => {
                    setClinics(prev => prev.map(c => c.id === updatedClinic.id ? updatedClinic : c));
                }}
            />

            {/* 6. NOTIFICATION MODAL */}
            <NotificationModal
                isOpen={isNotificationModalOpen}
                onClose={() => setIsNotificationModalOpen(false)}
                onNavigate={(tab) => setActiveTab(tab)}
                activeClinic={activeClinic}
            />

            {/* 7. AI VOICE CALL MODAL (Clinical Assistant for Doctor) */}
            <VoiceCallModal
                isOpen={isCallModalOpen}
                onClose={() => {
                    setIsCallModalOpen(false);
                    setSelectedPatientForCall(null);
                }}
                initialPatient={selectedPatientForCall}
                telegramUserId={currentUser?.telegram_id || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) || 999888777}
            />

            {/* 7. DOCUMENT UPLOAD MODAL */}
            <DocumentUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploaded={() => {}}
            />

        </div>
    );
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("UI Error caught by boundary:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-2xl">
                        ⚠️
                    </div>
                    <h2 className="text-xl font-bold">Error Loading Dashboard</h2>
                    <p className="text-xs text-slate-400 max-w-sm">
                        {String(this.state.error?.message || 'Please refresh the page to try again.')}
                    </p>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition"
                    >
                        🔄 Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    );
}
