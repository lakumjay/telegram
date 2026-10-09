import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, 
    ShieldAlert, 
    UserPlus, 
    Trash2, 
    Key, 
    CheckCircle2, 
    XCircle, 
    Lock,
    UserCheck,
    AlertCircle
} from 'lucide-react';
import axios from 'axios';

export default function SecurityWhitelist() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [telegramId, setTelegramId] = useState('');
    const [firstName, setFirstName] = useState('');
    const [role, setRole] = useState('user');
    const [accessPin, setAccessPin] = useState('123456');
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/telegram/users');
            setUsers(res.data.users || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!telegramId || !firstName) return;

        try {
            const res = await axios.post('/api/telegram/users', {
                telegram_id: telegramId,
                first_name: firstName,
                role: role,
                access_pin: accessPin,
                is_authorized: true,
            });

            if (res.data.success) {
                setMessage({ type: 'success', text: 'Telegram ID સફળતાપૂર્વક Whitelist થઈ ગયું!' });
                setTelegramId('');
                setFirstName('');
                fetchUsers();
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'યુઝર એડ કરવામાં ભૂલ આવી.' });
        }
    };

    const handleToggleAuth = async (id) => {
        try {
            await axios.post(`/api/telegram/users/${id}/toggle-auth`);
            fetchUsers();
        } catch (err) {
            console.error('Toggle auth error:', err);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('શું તમે આ યુઝરને દૂર કરવા માંગો છો?')) return;
        try {
            await axios.delete(`/api/telegram/users/${id}`);
            fetchUsers();
        } catch (err) {
            console.error('Delete user error:', err);
        }
    };

    return (
        <div className="space-y-6">
            
            {/* Top Security Banner */}
            <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                            <span>Telegram Bot & User Access Control</span>
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full">
                                Whitelist Active
                            </span>
                        </h3>
                        <p className="text-xs text-slate-300 max-w-xl mt-0.5 leading-relaxed">
                            Only authorized user accounts can access their private documents. Unapproved users will see Access Denied until you approve them.
                        </p>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-fadeIn ${
                    message.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-red-950/60 border-red-500/40 text-red-300'
                }`}>
                    <div className="flex items-center space-x-2">
                        {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <span>{message.text}</span>
                    </div>
                    <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Whitelisted Users Table */}
                <div className="lg:col-span-2 glass-panel p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                            <UserCheck className="w-4 h-4 text-blue-400" />
                            <span>Authorized Users & Access Control</span>
                        </h4>
                        <span className="text-xs text-slate-400">Total {users.length} users</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b border-slate-800 text-slate-400 font-semibold">
                                <tr>
                                    <th className="pb-3 px-2">User / Name</th>
                                    <th className="pb-3 px-2">Telegram ID</th>
                                    <th className="pb-3 px-2">Role</th>
                                    <th className="pb-3 px-2">Status</th>
                                    <th className="pb-3 px-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-900/40 transition">
                                        <td className="py-3 px-2 font-medium text-white">
                                            {u.first_name} {u.last_name || ''}
                                            {u.username && <span className="block text-[10px] text-slate-500">@{u.username}</span>}
                                        </td>
                                        <td className="py-3 px-2 font-mono text-slate-300">
                                            {u.telegram_id}
                                        </td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                                u.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-300'
                                            }`}>
                                                {u.role?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2">
                                            <button
                                                onClick={() => handleToggleAuth(u.id)}
                                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition ${
                                                    u.is_authorized
                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                                        : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                                }`}
                                            >
                                                {u.is_authorized ? (
                                                    <>
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>Authorized</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-3 h-3" />
                                                        <span>Blocked</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="py-3 px-2 text-right">
                                            <button
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                                                title="રદ કરો"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Add New Whitelist User Form */}
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                        <UserPlus className="w-4 h-4 text-emerald-400" />
                        <span>Add & Authorize User</span>
                    </h4>

                    <form onSubmit={handleAddUser} className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                                Telegram User ID
                            </label>
                            <input
                                type="number"
                                value={telegramId}
                                onChange={(e) => setTelegramId(e.target.value)}
                                placeholder="e.g. 999888777"
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                                (Can be found from @userinfobot on Telegram)
                            </span>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="e.g. Jay Patel"
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                                Security PIN
                            </label>
                            <input
                                type="text"
                                value={accessPin}
                                onChange={(e) => setAccessPin(e.target.value)}
                                placeholder="123456"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                                Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="user">User (Search & Download Only)</option>
                                <option value="admin">Admin (Full Control)</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Authorize & Add User</span>
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
