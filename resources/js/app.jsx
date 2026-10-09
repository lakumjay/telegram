import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Navbar from './components/Navbar';
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
    LogOut
} from 'lucide-react';

function App() {
    const [activeTab, setActiveTab] = useState('explorer');
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [stats, setStats] = useState(null);
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

    const handleLogout = () => {
        localStorage.removeItem('auth_user');
        setCurrentUser(null);
    };

    // If logged out manually, show LoginScreen
    if (!currentUser) {
        return <LoginScreen onLoginSuccess={(u) => setCurrentUser(u)} />;
    }

    return (
        <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
            
            {/* Header Navbar */}
            <Navbar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onOpenCall={() => setIsCallModalOpen(true)}
                onOpenUpload={() => setIsUploadModalOpen(true)}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
                onLogout={handleLogout}
                stats={stats}
            />

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">

                {/* Tab Views */}
                {activeTab === 'explorer' && (
                    <DocumentExplorer
                        onOpenUpload={() => setIsUploadModalOpen(true)}
                        onOpenCall={() => setIsCallModalOpen(true)}
                    />
                )}

                {activeTab === 'simulator' && (
                    <TelegramBotSimulator
                        onOpenCall={() => setIsCallModalOpen(true)}
                    />
                )}

                {activeTab === 'whitelist' && (
                    <SecurityWhitelist />
                )}

            </main>

            {/* Mobile Web App Floating Alexa Call Dial & Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 px-4 py-2 sm:hidden flex items-center justify-around">
                <button
                    onClick={() => setActiveTab('explorer')}
                    className={`flex flex-col items-center py-1 text-[11px] ${
                        activeTab === 'explorer' ? 'text-blue-400 font-bold' : 'text-slate-400'
                    }`}
                >
                    <Layers className="w-5 h-5 mb-0.5" />
                    <span>દસ્તાવેજો</span>
                </button>

                {/* Central Floating Alexa Call Button */}
                <button
                    onClick={() => setIsCallModalOpen(true)}
                    className="relative -top-5 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 text-white shadow-xl shadow-emerald-500/40 border-4 border-slate-950 flex items-center justify-center cursor-pointer active:scale-95 transition"
                >
                    <PhoneCall className="w-6 h-6 animate-bounce text-white" />
                </button>

                <button
                    onClick={() => setActiveTab('simulator')}
                    className={`flex flex-col items-center py-1 text-[11px] ${
                        activeTab === 'simulator' ? 'text-blue-400 font-bold' : 'text-slate-400'
                    }`}
                >
                    <MessageSquare className="w-5 h-5 mb-0.5" />
                    <span>ચેટ બોટ</span>
                </button>

                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex flex-col items-center py-1 text-[11px] text-slate-400"
                >
                    <FileText className="w-5 h-5 mb-0.5 text-blue-400" />
                    <span>અપલોડ</span>
                </button>
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500 hidden sm:block">
                <p>DocVoice AI Assistant • 100% Free Gemini & Whisper APIs • Built for Jay Sir</p>
            </footer>

            {/* Modals */}
            <VoiceCallModal
                isOpen={isCallModalOpen}
                onClose={() => setIsCallModalOpen(false)}
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

        </div>
    );
}

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(<App />);
}
