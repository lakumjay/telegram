import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, 
    UserPlus, 
    Trash2, 
    Key, 
    CheckCircle2, 
    XCircle, 
    Lock,
    UserCheck,
    AlertCircle,
    Building2,
    Users
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
                setMessage({ type: 'success', text: 'User & Telegram ID successfully authorized!' });
                setTelegramId('');
                setFirstName('');
                fetchUsers();
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Error adding user.' });
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
        if (!confirm('Are you sure you want to remove this user?')) return;
        try {
            await axios.delete(`/api/telegram/users/${id}`);
            fetchUsers();
        } catch (err) {
            console.error('Delete user error:', err);
        }
    };

    return (
        <div className="space-y-4 max-w-5xl mx-auto">
            
            {/* Top Security Banner (Modern Light SaaS) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-bold text-slate-900">
                                Roles & Permission Management
                            </h3>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                Access Control Active
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            Manage authorized users, assign roles (Admin vs Manager/User), and control access permissions. Unapproved users will see Access Pending.
                        </p>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-fadeIn ${
                    message.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                    <div className="flex items-center space-x-2">
                        {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                        <span>{message.text}</span>
                    </div>
                    <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                
                {/* Whitelisted Users Table */}
                <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span>Authorized Users & Roles</span>
                        </h4>
                        <span className="text-xs text-slate-500 font-medium">Total: {users.length}</span>
                    </div>

                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <table className="w-full text-left text-xs min-w-[500px]">
                            <thead className="border-b border-slate-100 text-slate-400 font-semibold bg-slate-50/50">
                                <tr>
                                    <th className="py-2.5 px-3">User / Name</th>
                                    <th className="py-2.5 px-3">Telegram ID</th>
                                    <th className="py-2.5 px-3">Role</th>
                                    <th className="py-2.5 px-3">Permission</th>
                                    <th className="py-2.5 px-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-8 text-slate-400 text-xs">
                                            No authorized users yet. Add one using the form on the right.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50/60 transition">
                                            <td className="py-3 px-3 font-semibold text-slate-900">
                                                {u.first_name} {u.last_name || ''}
                                                {u.username && <span className="block text-[10px] text-slate-400 font-normal">@{u.username}</span>}
                                            </td>
                                            <td className="py-3 px-3 font-mono text-slate-600 text-xs">
                                                {u.telegram_id}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                    u.role === 'admin' 
                                                        ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                }`}>
                                                    {u.role === 'admin' ? '👑 ADMIN' : '👤 USER / MGR'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                <button
                                                    onClick={() => handleToggleAuth(u.id)}
                                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition ${
                                                        u.is_authorized
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                                    }`}
                                                >
                                                    {u.is_authorized ? (
                                                        <>
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            <span>Approved</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle className="w-3 h-3 text-rose-600" />
                                                            <span>Pending</span>
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Add New User & Set Permissions Form */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <UserPlus className="w-4 h-4 text-emerald-600" />
                        <span>Add User & Assign Role</span>
                    </h4>

                    <form onSubmit={handleAddUser} className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Telegram User ID
                            </label>
                            <input
                                type="number"
                                value={telegramId}
                                onChange={(e) => setTelegramId(e.target.value)}
                                placeholder="e.g. 999888777"
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                            />
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                                User can find ID by sending /id in bot
                            </span>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="e.g. Ramesh Patel"
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Security PIN
                            </label>
                            <input
                                type="text"
                                value={accessPin}
                                onChange={(e) => setAccessPin(e.target.value)}
                                placeholder="123456"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Assigned Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-medium"
                            >
                                <option value="user">User / Manager (Company Docs Access)</option>
                                <option value="admin">Admin (Full Control & Whitelist)</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Save & Grant Access</span>
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
