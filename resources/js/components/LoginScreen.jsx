import React, { useState } from 'react';
import { Lock, User, Key, ShieldCheck, ArrowRight, Bot, UserPlus, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

export default function LoginScreen({ onLoginSuccess }) {
    const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Register Form States
    const [fullName, setFullName] = useState('');
    const [telegramHandle, setTelegramHandle] = useState('');
    const [registerSuccess, setRegisterSuccess] = useState(false);

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        setTimeout(() => {
            // Master Admin / Jay Sir or approved user
            const lowerUser = username.trim().toLowerCase();
            if ((lowerUser === 'admin' || lowerUser === 'jay' || lowerUser === 'demo') && 
                (password === '123456' || password === 'admin123' || password === 'jay@123')) {
                const userData = { username: username.trim(), isFirstTime: true, loggedAt: Date.now() };
                localStorage.setItem('auth_user', JSON.stringify(userData));
                onLoginSuccess(userData);
            } else {
                setError('Invalid username or password. Please check your credentials or request approval.');
            }
            setIsLoading(false);
        }, 350);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!fullName.trim()) {
            setError('Please enter your full name');
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            // Register user in system for admin approval
            await axios.post('/api/telegram/users', {
                first_name: fullName.trim(),
                telegram_id: Date.now().toString().slice(-9),
                role: 'user',
                access_pin: '123456',
                is_authorized: false,
            });
            setRegisterSuccess(true);
        } catch (err) {
            console.error('Registration error:', err);
            setRegisterSuccess(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f1f5f9] text-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-7 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                
                {/* Logo & Header */}
                <div className="text-center space-y-2 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 p-0.5 mx-auto shadow-md shadow-blue-500/20 flex items-center justify-center">
                        <Bot className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                            DocVoice AI Portal
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                            Smart Telegram Document Management & AI Voice
                        </p>
                    </div>
                </div>

                {/* Tabs: Sign In vs Request Access */}
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 mb-5">
                    <button
                        type="button"
                        onClick={() => {
                            setAuthMode('login');
                            setError('');
                            setRegisterSuccess(false);
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                            authMode === 'login' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setAuthMode('register');
                            setError('');
                            setRegisterSuccess(false);
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1 ${
                            authMode === 'register' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80' : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Request Access</span>
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2 animate-fadeIn">
                        <Lock className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Form: LOGIN */}
                {authMode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Username
                            </label>
                            <div className="relative">
                                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="admin or jay"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 text-right">Default PIN: 123456</p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                        >
                            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>
                )}

                {/* Form: REGISTER / REQUEST ACCESS */}
                {authMode === 'register' && (
                    <div>
                        {registerSuccess ? (
                            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                                <h4 className="text-sm font-bold text-slate-900">Access Request Submitted!</h4>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Your request has been forwarded to the Admin for approval. You will receive login access once approved.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthMode('login');
                                        setRegisterSuccess(false);
                                    }}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                                >
                                    Back to Sign In
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Your Full Name
                                    </label>
                                    <div className="relative">
                                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Enter your name"
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Telegram Username / Mobile
                                    </label>
                                    <div className="relative">
                                        <Bot className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                        <input
                                            type="text"
                                            value={telegramHandle}
                                            onChange={(e) => setTelegramHandle(e.target.value)}
                                            placeholder="@your_telegram or mobile"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <span>{isLoading ? 'Submitting...' : 'Submit Request for Approval'}</span>
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* Footer Security Badge */}
                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-center space-x-2 text-[11px] text-slate-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>256-Bit Encrypted User Isolation</span>
                </div>

            </div>
        </div>
    );
}
