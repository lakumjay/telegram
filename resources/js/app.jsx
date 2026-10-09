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
    UploadCloud
} from 'lucide-react';

function App() {
    const [activeTab, setActiveTab] = useState('home'); // 'home' (Dashboard) | 'files' (My Files) | 'simulator'
    const [filesFilter, setFilesFilter] = useState({ companyId: '', docType: '', search: '' });
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
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
        <div className="min-h-screen w-full bg-[#f1f5f9] text-slate-900 flex flex-col selection:bg-emerald-600 selection:text-white overflow-y-auto">
            
            {/* Header Navbar */}
            <Navbar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onOpenCall={() => setIsCallModalOpen(true)}
                onOpenUpload={handleOpenUpload}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                onLogout={handleLogout}
                stats={stats}
            />

            {/* Main Content Area with adequate pb-36 and scrolling support so all pages scroll smoothly */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4 pb-36 overflow-y-visible">

                {/* 1. Home Dashboard View */}
                {activeTab === 'home' && (
                    <DashboardHome
                        stats={stats}
                        companies={companies}
                        onOpenCall={() => setIsCallModalOpen(true)}
                        onOpenUpload={handleOpenUpload}
                        onNavigateToFiles={handleNavigateToFiles}
                    />
                )}

                {/* 2. My Files View (Dedicated Document Explorer) */}
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

                {/* 3. Telegram Simulator */}
                {activeTab === 'simulator' && (
                    <TelegramBotSimulator
                        onOpenCall={() => setIsCallModalOpen(true)}
                    />
                )}

                {/* 4. Security Whitelist */}
                {activeTab === 'whitelist' && (
                    <SecurityWhitelist />
                )}

            </main>

            {/* Mobile Bottom Navigation Bar (Home, My Files, AI Call, Upload) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden flex items-center justify-around shadow-lg">
                {/* 1. Home Tab */}
                <button
                    onClick={() => {
                        triggerHaptic(10);
                        setActiveTab('home');
                    }}
                    className={`flex flex-col items-center py-1 text-[11px] font-semibold transition active:scale-90 ${
                        activeTab === 'home' ? 'text-emerald-700 font-bold' : 'text-slate-400'
                    }`}
                >
                    <Bot className="w-5 h-5 mb-0.5" />
                    <span>Home</span>
                </button>

                {/* 2. My Files Tab */}
                <button
                    onClick={() => {
                        triggerHaptic(10);
                        handleNavigateToFiles({});
                    }}
                    className={`flex flex-col items-center py-1 text-[11px] font-semibold transition active:scale-90 ${
                        activeTab === 'files' ? 'text-emerald-700 font-bold' : 'text-slate-400'
                    }`}
                >
                    <Layers className="w-5 h-5 mb-0.5" />
                    <span>My Files</span>
                </button>

                {/* 3. Central AI Call Dial */}
                <button
                    onClick={() => {
                        triggerHaptic(20);
                        setIsCallModalOpen(true);
                    }}
                    className="relative -top-4 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-700/30 border-4 border-[#f1f5f9] flex items-center justify-center cursor-pointer active:scale-90 transition"
                    title="Start AI Call"
                >
                    <PhoneCall className="w-5 h-5 text-white" />
                </button>

                {/* 4. Upload File Button */}
                <button
                    onClick={() => {
                        triggerHaptic(12);
                        handleOpenUpload('file');
                    }}
                    className="flex flex-col items-center py-1 text-[11px] font-semibold text-slate-400 hover:text-emerald-700 transition active:scale-90"
                >
                    <UploadCloud className="w-5 h-5 mb-0.5" />
                    <span>Upload</span>
                </button>

                {/* 5. Roles & Access Tab */}
                <button
                    onClick={() => {
                        triggerHaptic(10);
                        setActiveTab('whitelist');
                    }}
                    className={`flex flex-col items-center py-1 text-[11px] font-semibold transition active:scale-90 ${
                        activeTab === 'whitelist' ? 'text-emerald-700 font-bold' : 'text-slate-400'
                    }`}
                >
                    <ShieldCheck className="w-5 h-5 mb-0.5" />
                    <span>Roles</span>
                </button>
            </div>

            {/* PWA Install App Toast Banner */}
            {canInstall && (
                <div className="fixed top-16 left-4 right-4 z-50 sm:hidden bg-blue-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between animate-slideDown">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold leading-tight">Install DocVoice AI</p>
                            <p className="text-[10px] text-blue-100">Add to home screen like a native app</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <button
                            onClick={handleInstallPWA}
                            className="px-3 py-1 bg-white text-blue-600 font-bold text-xs rounded-lg shadow-xs"
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

            {/* Modals */}
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
