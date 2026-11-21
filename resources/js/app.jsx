import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Navbar from './components/Navbar';
import DashboardHome from './components/DashboardHome';
import DocumentExplorer from './components/DocumentExplorer';
import TelegramBotSimulator from './components/TelegramBotSimulator';
import SecurityWhitelist from './components/SecurityWhitelist';
import VoiceCallModal from './components/VoiceCallModal';
import DocumentUploadModal from './components/DocumentUploadModal';
import SettingsModal from './components/SettingsModal';
import LoginScreen from './components/LoginScreen';
import WelcomeTourModal from './components/WelcomeTourModal';
import DoctorPatientManager from './components/DoctorPatientManager';
import ClinicBillingStockManager from './components/ClinicBillingStockManager';
import MobileHeader from './components/MobileHeader';
import MoreSettingsDrawer from './components/MoreSettingsDrawer';
import axios from 'axios';
import { 
    PhoneCall, 
    FileText, 
    ShieldCheck, 
    Sparkles, 
    Bot, 
    Layers, 
    Archive, 
    CheckCircle2, 
    MessageSquare, 
    Sliders, 
    LogOut, 
    UploadCloud, 
    Stethoscope,
    Receipt,
    Download
} from 'lucide-react';

function App() {
    const [activeTab, setActiveTab] = useState('patients'); // Default directly to Doctor Clinic!
    const [filesFilter, setFilesFilter] = useState({ companyId: '', docType: '', search: '' });
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);
    const [clinics, setClinics] = useState([]);
    const [activeClinicId, setActiveClinicId] = useState(1);
    const [stats, setStats] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('auth_user');
            return saved ? JSON.parse(saved) : { username: 'Jay Sir (Admin)', role: 'admin' };
        } catch(e) {
            return { username: 'Jay Sir (Admin)', role: 'admin' };
        }
    });
    const [isTourOpen, setIsTourOpen] = useState(() => {
        return !localStorage.getItem('docvoice_tour_seen');
    });

    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [canInstall, setCanInstall] = useState(false);

    // Native Haptic Vibration Feedback Helper (10ms light tap)
    const triggerHaptic = (duration = 12) => {
        if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
            try {
                window.navigator.vibrate(duration);
            } catch(e) {}
        }
    };

    useEffect(() => {
        fetchStats();
        fetchCompanies();
        fetchClinics();

        // Listen for PWA Install prompt event
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setCanInstall(true);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Initialize Telegram WebApp SDK if present
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

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/documents/stats');
            setStats(res.data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const fetchCompanies = async () => {
        try {
            const res = await axios.get('/api/companies');
            setCompanies(res.data.companies || []);
        } catch (err) {
            console.error('Error fetching companies:', err);
        }
    };

    const handleNavigateToFiles = ({ companyId = '', docType = '', search = '' } = {}) => {
        setFilesFilter({ companyId, docType, search });
        setActiveTab('files');
    };

    const handleOpenUpload = () => {
        setIsUploadModalOpen(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_user');
        setCurrentUser(null);
    };

    // If logged out manually, show LoginScreen
    if (!currentUser) {
        return <LoginScreen onLoginSuccess={(u) => setCurrentUser(u)} />;
    }

    return (
        <div className="min-h-screen w-full bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-emerald-600 selection:text-white overflow-y-auto">
            
            {/* 1. Dedicated Mobile Header (Solo Doctor App Design) */}
            <MobileHeader
                clinics={clinics}
                activeClinicId={activeClinicId}
                onSelectClinic={(id) => setActiveClinicId(id)}
                onOpenMoreMenu={() => setIsMoreDrawerOpen(true)}
                onOpenVoiceCall={() => setIsCallModalOpen(true)}
            />

            {/* Desktop Navbar for larger screens */}
            <div className="hidden md:block">
                <Navbar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onOpenCall={() => setIsCallModalOpen(true)}
                    onOpenUpload={handleOpenUpload}
                    onOpenSettings={() => setIsSettingsModalOpen(true)}
                    onLogout={handleLogout}
                    stats={stats}
                />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-4 pb-28">

                {/* 1. Doctor Clinic Patient Records (Primary Screen) */}
                {activeTab === 'patients' && (
                    <DoctorPatientManager
                        activeClinicId={activeClinicId}
                        onOpenVoiceCall={() => setIsCallModalOpen(true)}
                    />
                )}

                {/* 2. Multi-Clinic Accounts, Billing, Stock & Expenses */}
                {activeTab === 'billing' && (
                    <ClinicBillingStockManager activeClinicId={activeClinicId} />
                )}

                {/* 3. Home Dashboard View */}
                {activeTab === 'home' && (
                    <DashboardHome
                        stats={stats}
                        companies={companies}
                        onOpenCall={() => setIsCallModalOpen(true)}
                        onOpenUpload={handleOpenUpload}
                        onNavigateToFiles={handleNavigateToFiles}
                        onNavigateToPatients={() => setActiveTab('patients')}
                    />
                )}

                {/* 4. My Files View (Dedicated Document Explorer) */}
                {activeTab === 'files' && (
                    <DocumentExplorer
                        onOpenUpload={handleOpenUpload}
                        onOpenCall={() => setIsCallModalOpen(true)}
                        initialCompanyId={filesFilter.companyId}
                        initialDocType={filesFilter.docType}
                        initialSearch={filesFilter.search}
                        isMyFilesPage={true}
                    />
                )}

                {/* 5. Telegram Simulator */}
                {activeTab === 'simulator' && (
                    <TelegramBotSimulator
                        onOpenCall={() => setIsCallModalOpen(true)}
                    />
                )}

                {/* 6. Security Whitelist */}
                {activeTab === 'whitelist' && (
                    <SecurityWhitelist />
                )}

            </main>

            {/* Mobile Bottom Navigation Bar (Clinic, AI Call, Billing & More) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-6 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] md:hidden flex items-center justify-between shadow-lg">
                
                {/* 1. Clinic Tab */}
                <button
                    onClick={() => {
                        triggerHaptic(10);
                        setActiveTab('patients');
                    }}
                    className={`flex flex-col items-center py-1 transition active:scale-95 cursor-pointer ${
                        activeTab === 'patients' ? 'text-emerald-700 font-extrabold' : 'text-slate-400 font-semibold'
                    }`}
                >
                    <Stethoscope className="w-5 h-5 mb-0.5" />
                    <span className="text-[11px]">Clinic</span>
                </button>

                {/* 2. Central Big Round AI Call Dial Button */}
                <button
                    onClick={() => {
                        triggerHaptic(20);
                        setIsCallModalOpen(true);
                    }}
                    className="relative -top-4 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-xl shadow-emerald-700/30 border-4 border-[#f8fafc] flex items-center justify-center cursor-pointer active:scale-90 transition"
                    title="Start AI Call"
                >
                    <PhoneCall className="w-6 h-6 text-white" />
                </button>

                {/* 3. Billing & Stock Tab */}
                <button
                    onClick={() => {
                        triggerHaptic(10);
                        setActiveTab('billing');
                    }}
                    className={`flex flex-col items-center py-1 transition active:scale-95 cursor-pointer ${
                        activeTab === 'billing' ? 'text-emerald-700 font-extrabold' : 'text-slate-400 font-semibold'
                    }`}
                >
                    <Receipt className="w-5 h-5 mb-0.5" />
                    <span className="text-[11px]">Billing</span>
                </button>

                {/* 4. More Tab */}
                <button
                    onClick={() => {
                        triggerHaptic(10);
                        setIsMoreDrawerOpen(true);
                    }}
                    className="flex flex-col items-center py-1 text-slate-400 font-semibold hover:text-slate-700 transition active:scale-95 cursor-pointer"
                >
                    <Sliders className="w-5 h-5 mb-0.5" />
                    <span className="text-[11px]">More</span>
                </button>
            </div>

            {/* PWA Install Banner (Top Fixed Toast with 1-Tap Install) */}
            {canInstall && (
                <div className="fixed top-16 left-3 right-3 z-50 md:hidden bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-3.5 rounded-3xl shadow-2xl flex items-center justify-between border border-emerald-500/40 animate-slideDown">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Stethoscope className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-black leading-tight">Install Clinic Mobile App</p>
                            <p className="text-[11px] text-emerald-100 mt-0.5">હોમ સ્ક્રીન પર એપ આઈકોન ઉમેરો</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleInstallPWA}
                            className="px-3.5 py-1.5 bg-white text-emerald-800 font-black text-xs rounded-xl shadow-xs active:scale-95 transition cursor-pointer"
                        >
                            Install
                        </button>
                        <button
                            onClick={() => setCanInstall(false)}
                            className="p-1 text-white/70 hover:text-white text-xs"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="border-t border-slate-200/90 py-4 text-center text-xs text-slate-500 hidden sm:block">
                <p>DocVoice AI Assistant • 100% Free Gemini & Whisper APIs • Built for Jay Sir</p>
            </footer>

            {/* Modals & Drawers */}
            <MoreSettingsDrawer
                isOpen={isMoreDrawerOpen}
                onClose={() => setIsMoreDrawerOpen(false)}
                clinics={clinics}
                activeClinicId={activeClinicId}
                onSelectClinic={(id) => setActiveClinicId(id)}
                onNavigate={(tab) => setActiveTab(tab)}
                onInstallPwa={handleInstallPWA}
                canInstall={canInstall}
                onLogout={handleLogout}
            />

            <VoiceCallModal
                isOpen={isCallModalOpen}
                onClose={() => setIsCallModalOpen(false)}
                telegramUserId={currentUser?.telegram_id || (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) || 999888777}
            />

            <DocumentUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploaded={() => {
                    fetchStats();
                }}
            />

            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
            />

            {/* First-time User Welcome & Menu Tour Modal */}
            <WelcomeTourModal
                isOpen={isTourOpen}
                userName={currentUser?.username}
                onClose={() => {
                    localStorage.setItem('docvoice_tour_seen', 'true');
                    setIsTourOpen(false);
                }}
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
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition"
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
