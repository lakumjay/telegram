import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Navbar from './components/Navbar';
import DocumentExplorer from './components/DocumentExplorer';
import TelegramBotSimulator from './components/TelegramBotSimulator';
import SecurityWhitelist from './components/SecurityWhitelist';
import VoiceCallModal from './components/VoiceCallModal';
import DocumentUploadModal from './components/DocumentUploadModal';
import SettingsModal from './components/SettingsModal';
import StandaloneVoiceTest from './components/StandaloneVoiceTest';
import axios from 'axios';
import { 
    PhoneCall, 
    FileText, 
    ShieldCheck, 
    Sparkles, 
    Bot, 
    Layers, 
    Archive,
    CheckCircle2
} from 'lucide-react';

function App() {
    const [activeTab, setActiveTab] = useState('explorer');
    const [isCallModalOpen, setIsCallModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [stats, setStats] = useState(null);

    // Standalone Voice Test Page
    if (window.location.pathname.includes('/voice-test')) {
        return <StandaloneVoiceTest />;
    }

    // Check if running inside Telegram Mini App
    const isTelegramMiniApp = window.location.pathname.includes('/miniapp') || Boolean(window.Telegram?.WebApp?.initData);

    useEffect(() => {
        fetchStats();

        // Initialize Telegram WebApp SDK if present
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
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

    // If loaded as Telegram Mini App, auto open Voice Call or streamlined view
    if (isTelegramMiniApp) {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col justify-between">
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center space-x-2">
                            <Bot className="w-6 h-6 text-cyan-400" />
                            <h2 className="font-bold text-base">DocVoice AI Mini App</h2>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full">
                            Telegram Active
                        </span>
                    </div>

                    <div className="p-5 bg-gradient-to-br from-blue-900/40 via-slate-900 to-purple-900/40 border border-slate-800 rounded-3xl text-center space-y-3">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 p-1 mx-auto shadow-lg shadow-purple-500/30">
                            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-2xl">
                                👩‍💼
                            </div>
                        </div>
                        <h3 className="font-bold text-lg text-white">ધ્વનિ (Dhwani AI)</h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            ગુજરાતીમાં ઝડપથી બોલીને કોઈપણ કંપનીના દસ્તાવેજ, પાનકાર્ડ, જીએસટી કે ₹300 સ્ટેમ્પ પેપર મેળવો.
                        </p>
                        <button
                            onClick={() => setIsCallModalOpen(true)}
                            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/40 flex items-center justify-center space-x-2 cursor-pointer"
                        >
                            <PhoneCall className="w-5 h-5 animate-bounce" />
                            <span>📞 લાઇવ AI Voice Call શરૂ કરો</span>
                        </button>
                    </div>

                    <DocumentExplorer
                        onOpenUpload={() => setIsUploadModalOpen(true)}
                        onOpenCall={() => setIsCallModalOpen(true)}
                    />
                </div>

                <VoiceCallModal
                    isOpen={isCallModalOpen}
                    onClose={() => setIsCallModalOpen(false)}
                />
            </div>
        );
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
                stats={stats}
            />

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                
                {/* Hero Stats Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="glass-card p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 font-medium">કુલ દસ્તાવેજો</p>
                            <h3 className="text-lg font-bold text-white">{stats?.total_documents || 0}</h3>
                        </div>
                    </div>

                    <div className="glass-card p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 font-medium">Deep OCR ઇન્ડેક્સ</p>
                            <h3 className="text-lg font-bold text-white">{stats?.total_ocr_indexed || 0}</h3>
                        </div>
                    </div>

                    <div className="glass-card p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 font-medium">સ્ટેમ્પ પેપર્સ (Stamps)</p>
                            <h3 className="text-lg font-bold text-white">{stats?.stamp_papers_count || 0}</h3>
                        </div>
                    </div>

                    <div className="glass-card p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-400 font-medium">સિક્યુરિટી & વ્હાઇટલિસ્ટ</p>
                            <h3 className="text-lg font-bold text-emerald-400">સક્રિય (Active)</h3>
                        </div>
                    </div>
                </div>

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

            {/* Footer */}
            <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
                <p>AI Document Assistant & Telegram Voice Bot • 100% Free APIs (Gemini Flash & Whisper)</p>
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
