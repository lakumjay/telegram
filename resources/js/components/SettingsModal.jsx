import React, { useState, useEffect } from 'react';
import { Sliders, Key, Bot, Shield, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import axios from 'axios';

export default function SettingsModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const [settings, setSettings] = useState({
        telegram_bot_token: '',
        bot_username: '',
        whitelist_enabled: true,
        master_security_pin: '123456',
        groq_api_key: '',
        gemini_api_key: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        axios.get('/api/settings').then(res => {
            if (res.data.settings) {
                setSettings(res.data.settings);
            }
        }).catch(err => console.error(err));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        try {
            const res = await axios.post('/api/settings', settings);
            if (res.data.success) {
                setMessage({ type: 'success', text: 'સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવ્યા!' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'સેટિંગ્સ સાચવવામાં ભૂલ આવી.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                            <Sliders className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">સિસ્ટમ & API સેટિંગ્સ</h3>
                            <p className="text-[11px] text-slate-400">Telegram Bot અને Free API કી કન્ફિગરેશન</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                {message && (
                    <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                        message.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-red-950/60 border-red-500/40 text-red-300'
                    }`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <span>{message.text}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                    
                    {/* Telegram Bot Token */}
                    <div>
                        <label className="block font-semibold text-slate-300 mb-1">
                            🤖 Telegram Bot Token
                        </label>
                        <input
                            type="text"
                            value={settings.telegram_bot_token || ''}
                            onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                            placeholder="123456789:ABCdefGhIJKlmNoPQRstuvWxyz"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                            Telegram માં @BotFather પાસેથી બોટ બનાવીને મળેલો ટોકન
                        </span>
                    </div>

                    {/* Groq API Key (Free Whisper) */}
                    <div>
                        <label className="block font-semibold text-slate-300 mb-1">
                            🎙️ Groq API Key (100% Free - Fast Whisper Voice STT)
                        </label>
                        <input
                            type="password"
                            value={settings.groq_api_key || ''}
                            onChange={(e) => setSettings({ ...settings, groq_api_key: e.target.value })}
                            placeholder="gsk_..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                            console.groq.com પરથી ફ્રી API Key (ઝડપી વૉઇસ સમજવા માટે)
                        </span>
                    </div>

                    {/* Google Gemini API Key (Free OCR) */}
                    <div>
                        <label className="block font-semibold text-slate-300 mb-1">
                            🧠 Google Gemini API Key (100% Free - OCR & Search Brain)
                        </label>
                        <input
                            type="password"
                            value={settings.gemini_api_key || ''}
                            onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                            placeholder="AIzaSy..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                            aistudio.google.com પરથી ફ્રી Gemini Flash API Key
                        </span>
                    </div>

                    {/* Master Security PIN */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                            <label className="block font-semibold text-slate-300 mb-1">
                                🔐 માસ્ટર સિક્યુરિટી PIN
                            </label>
                            <input
                                type="text"
                                value={settings.master_security_pin || '123456'}
                                onChange={(e) => setSettings({ ...settings, master_security_pin: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-300 mb-1">
                                🛡️ Whitelist સિક્યુરિટી
                            </label>
                            <div className="flex items-center h-9">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(settings.whitelist_enabled)}
                                        onChange={(e) => setSettings({ ...settings, whitelist_enabled: e.target.checked })}
                                        className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
                                    />
                                    <span className="text-slate-300">ઓનલી Whitelisted IDs Allow કરો</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition"
                        >
                            બંધ કરો
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center space-x-1.5 cursor-pointer"
                        >
                            <Save className="w-4 h-4" />
                            <span>{isSaving ? 'સાચવે છે...' : 'સેટિંગ્સ સાચવો'}</span>
                        </button>
                    </div>

                </form>

            </div>
        </div>
    );
}
