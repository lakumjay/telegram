import React, { useState } from 'react';
import { Lock, User, Key, ShieldCheck, ArrowRight, Bot } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        setTimeout(() => {
            // Master Admin / Jay Sir Login credentials
            if ((username.trim().toLowerCase() === 'admin' || username.trim().toLowerCase() === 'jay') && 
                (password === '123456' || password === 'admin123' || password === 'jay@123')) {
                localStorage.setItem('auth_user', JSON.stringify({ username: username.trim(), loggedAt: Date.now() }));
                onLoginSuccess({ username: username.trim() });
            } else {
                setError('ખોટું યુઝરનેમ અથવા પાસવર્ડ! કૃપા કરીને સાચી વિગત દાખલ કરો.');
            }
            setIsLoading(false);
        }, 400);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-[#080d1a] text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                
                {/* Glow Background */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

                {/* Logo & Header */}
                <div className="text-center space-y-3 mb-8 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 mx-auto shadow-xl shadow-blue-500/20 flex items-center justify-center">
                        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                            <Bot className="w-8 h-8 text-cyan-400 animate-pulse" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                            DocVoice AI Portal
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            સિક્યોર ડોક્યુમેન્ટ અને એલેક્સા વૉઇસ એક્સેસ
                        </p>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-3 bg-red-950/60 border border-red-500/50 rounded-2xl text-xs text-red-200 flex items-center space-x-2 animate-fadeIn">
                        <Lock className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            યુઝરનેમ (Username)
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="દા.ત. admin અથવા jay"
                                required
                                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            સિક્યોરિટી પાસવર્ડ (Password)
                        </label>
                        <div className="relative">
                            <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="પાસવર્ડ દાખલ કરો"
                                required
                                className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 text-right">Default PIN: 123456</p>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                    >
                        <span>{isLoading ? 'ચકાસણી ચાલુ છે...' : 'સિક્યોર લૉગિન કરો'}</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>

                {/* Footer Security Badge */}
                <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>256-Bit Encrypted Telegram Voice System</span>
                </div>

            </div>
        </div>
    );
}
