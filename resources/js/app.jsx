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
    Camera
} from 'lucide-react';

function App() {
    const [activeTab, setActiveTab] = useState('home'); // 'home' (Dashboard) | 'files' (My Files) | 'simulator'
    const [filesFilter, setFilesFilter] = useState({ companyId: '', docType: '', search: '' });
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadModalMode, setUploadModalMode] = useState('file'); // 'file' or 'camera'
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

    // Check if running inside Telegram Mini App
    const isTelegramMiniApp = window.location.pathname.includes('/miniapp') || Boolean(window.Telegram?.WebApp?.initData);

    useEffect(() => {
        fetchStats();
        fetchCompanies();

        // Initialize Telegram WebApp SDK if present
        if (window.Telegram?.WebApp) {
            try {
                window.Telegram.WebApp.ready();
                window.Telegram.WebApp.expand();
            } catch(e) {}
        }
    }, []);

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

    const handleOpenUpload = (mode = 'file') => {
        setUploadModalMode(mode);
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
        <div className="min-h-screen bg-[#f1f5f9] text-slate-900 flex flex-col selection:bg-emerald-600 selection:text-white">
            
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

            {/* Main Content Area with adequate pb-32 so mobile content is never clipped */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4 pb-32">

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

            {/* Mobile Bottom Navigation Bar (Home, My Files, Upload/Dial, CamScanner) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-2 sm:hidden flex items-center justify-around shadow-lg">
                {/* 1. Home Tab */}
                <button
                    onClick={() => setActiveTab('home')}
                    className={`flex flex-col items-center py-1 text-[11px] font-semibold transition ${
                        activeTab === 'home' ? 'text-emerald-700 font-bold' : 'text-slate-400'
                    }`}
                >
                    <Bot className="w-5 h-5 mb-0.5" />
                    <span>Home</span>
                </button>

                {/* 2. My Files Tab */}
                <button
                    onClick={() => handleNavigateToFiles({})}
                    className={`flex flex-col items-center py-1 text-[11px] font-semibold transition ${
                        activeTab === 'files' ? 'text-emerald-700 font-bold' : 'text-slate-400'
                    }`}
                >
                    <Layers className="w-5 h-5 mb-0.5" />
                    <span>My Files</span>
                </button>

                {/* 3. Central AI Call Dial */}
                <button
                    onClick={() => setIsCallModalOpen(true)}
                    className="relative -top-4 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-700/30 border-4 border-[#f1f5f9] flex items-center justify-center cursor-pointer active:scale-95 transition"
                    title="Start AI Call"
                >
                    <PhoneCall className="w-5 h-5 text-white" />
                </button>

                {/* 4. CamScanner Button */}
                <button
                    onClick={() => handleOpenUpload('camera')}
                    className="flex flex-col items-center py-1 text-[11px] font-semibold text-slate-400 hover:text-emerald-700 transition"
                >
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span>Scan</span>
                </button>

                {/* 5. Upload Button */}
                <button
                    onClick={() => handleOpenUpload('file')}
                    className="flex flex-col items-center py-1 text-[11px] font-semibold text-slate-400 hover:text-emerald-700 transition"
                >
                    <UploadCloud className="w-5 h-5 mb-0.5" />
                    <span>Upload</span>
                </button>
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-200/90 py-4 text-center text-xs text-slate-500 hidden sm:block">
                <p>DocVoice AI Assistant • 100% Free Gemini & Whisper APIs • Built for Jay Sir</p>
            </footer>

            {/* Modals */}
            <VoiceCallModal
                isOpen={isCallModalOpen}
                onClose={() => setIsCallModalOpen(false)}
            />

            <DocumentUploadModal
                isOpen={isUploadModalOpen}
                initialMode={uploadModalMode}
                onClose={() => setIsUploadModalOpen(false)}
                onUploaded={() => {
                    fetchStats();
                }}
            />

            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
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
                    <h2 className="text-xl font-bold">ડેશબોર્ડ લોડ કરવામાં સમસ્યા આવી</h2>
                    <p className="text-xs text-slate-400 max-w-sm">
                        {String(this.state.error?.message || 'કૃપા કરીને ફરી રિફ્રેશ કરો.')}
                    </p>
                    <button
                        onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition"
                    >
                        🔄 ફરી લોડ કરો (Reload)
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
