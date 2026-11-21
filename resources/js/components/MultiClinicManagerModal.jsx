import React, { useState } from 'react';
import axios from 'axios';
import { 
    Building2, 
    X, 
    Plus, 
    Check, 
    Trash2, 
    Edit2, 
    User, 
    Phone, 
    MapPin, 
    Send, 
    Key, 
    RefreshCw, 
    AlertCircle, 
    CheckCircle2,
    ArrowRight,
    ShieldCheck
} from 'lucide-react';

export default function MultiClinicManagerModal({ 
    isOpen, 
    onClose, 
    clinics = [], 
    activeClinicId, 
    onSelectClinic, 
    onClinicsUpdated 
}) {
    if (!isOpen) return null;

    const [viewMode, setViewMode] = useState('list'); // 'list' | 'add' | 'edit'
    const [editingClinic, setEditingClinic] = useState(null);

    // Form states
    const [name, setName] = useState('');
    const [doctorName, setDoctorName] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [qualification, setQualification] = useState('MBBS, MD');
    const [specialization, setSpecialization] = useState('General Physician & Consulting Doctor');
    const [defaultFee, setDefaultFee] = useState('300');
    const [telegramUsername, setTelegramUsername] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Quick Telegram update state
    const [telegramEditId, setTelegramEditId] = useState(null);
    const [quickTelegramVal, setQuickTelegramVal] = useState('');

    const handleOpenAdd = () => {
        setEditingClinic(null);
        setName('');
        setDoctorName('');
        setPhone('');
        setCity('');
        setQualification('MBBS, MD');
        setSpecialization('General Physician & Consulting Doctor');
        setDefaultFee('300');
        setTelegramUsername('');
        setErrorMsg('');
        setSuccessMsg('');
        setViewMode('add');
    };

    const handleOpenEdit = (c) => {
        setEditingClinic(c);
        setName(c.name || '');
        setDoctorName(c.doctor_name || '');
        setPhone(c.phone || '');
        setCity(c.city || '');
        setQualification(c.qualification || 'MBBS, MD');
        setSpecialization(c.specialization || 'General Physician');
        setDefaultFee(c.default_consultation_fee || '300');
        setTelegramUsername(c.telegram_username || '');
        setErrorMsg('');
        setSuccessMsg('');
        setViewMode('edit');
    };

    const handleSaveClinic = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!name.trim()) {
            setErrorMsg('ક્લિનિકનું નામ દાખલ કરવું ફરજિયાત છે.');
            return;
        }
        if (!doctorName.trim()) {
            setErrorMsg('ડૉક્ટરનું નામ દાખલ કરવું ફરજિયાત છે.');
            return;
        }

        setIsSaving(true);
        try {
            if (editingClinic) {
                // Update
                const res = await axios.post(`/api/clinic-accounts/clinics/${editingClinic.id}`, {
                    name: name.trim(),
                    doctor_name: doctorName.trim(),
                    phone: phone.trim() || null,
                    city: city.trim() || null,
                    qualification: qualification.trim(),
                    specialization: specialization.trim(),
                    default_consultation_fee: defaultFee,
                    telegram_username: telegramUsername.trim() || null
                });

                if (res.data?.success) {
                    if (window.showAppToast) window.showAppToast('✅ ક્લિનિક પ્રોફાઇલ અપડેટ થઈ ગઈ!');
                    if (onClinicsUpdated) onClinicsUpdated();
                    setViewMode('list');
                }
            } else {
                // Create
                const res = await axios.post('/api/clinic-accounts/clinics', {
                    name: name.trim(),
                    doctor_name: doctorName.trim(),
                    phone: phone.trim() || null,
                    city: city.trim() || null,
                    qualification: qualification.trim(),
                    specialization: specialization.trim(),
                    default_consultation_fee: defaultFee,
                    telegram_username: telegramUsername.trim() || null
                });

                if (res.data?.success) {
                    if (window.showAppToast) window.showAppToast('✅ નવું ક્લિનિક સફળતાપૂર્વક બની ગયું!');
                    if (onClinicsUpdated) onClinicsUpdated();
                    setViewMode('list');
                }
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'ક્લિનિક સેવ કરવામાં ક્ષતિ આવી.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClinic = async (clinicId) => {
        if (!confirm('શું તમે ખરેખર આ ક્લિનિક ડિલીટ કરવા માંગો છો? આના તમામ રેકોર્ડ્સ દૂર થઈ જશે.')) return;
        try {
            const res = await axios.delete(`/api/clinic-accounts/clinics/${clinicId}`);
            if (res.data?.success) {
                if (window.showAppToast) window.showAppToast(res.data.message || '🗑️ ક્લિનિક ડિલીટ થઈ ગયું.');
                if (onClinicsUpdated) onClinicsUpdated();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'ક્લિનિક ડિલીટ થઈ શક્યું નહીં.');
        }
    };

    const handleQuickSaveTelegram = async (c) => {
        try {
            const res = await axios.post(`/api/clinic-accounts/clinics/${c.id}`, {
                name: c.name,
                doctor_name: c.doctor_name,
                telegram_username: quickTelegramVal.replace('@', '').trim()
            });
            if (res.data?.success) {
                if (window.showAppToast) window.showAppToast('✅ ટેલિગ્રામ યુઝરનેમ સેવ થઈ ગયું!');
                setTelegramEditId(null);
                if (onClinicsUpdated) onClinicsUpdated();
            }
        } catch (err) {
            alert('સેવ કરવામાં ભૂલ આવી.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 my-6 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col overflow-hidden">
                
                {/* 1. Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-xs">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                                Multi-Clinic Management
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium">
                                બધા ક્લિનિક્સ & ડૉક્ટર એકાઉન્ટ્સ મેનેજ કરો
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 2. Top Tabs: Clinics List vs Add Clinic */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                            viewMode === 'list'
                                ? 'bg-teal-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <span>બધા ક્લિનિક્સ ({clinics.length})</span>
                    </button>

                    <button
                        onClick={handleOpenAdd}
                        className={`py-2 px-4 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                            viewMode === 'add'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80'
                        }`}
                    >
                        <Plus className="w-4 h-4" />
                        <span>+ નવું ક્લિનિક ઉમેરો</span>
                    </button>
                </div>

                {/* 3. Modal Body */}
                <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                    
                    {/* VIEW: ALL CLINICS LIST */}
                    {viewMode === 'list' && (
                        <div className="space-y-3">
                            {clinics.map(c => {
                                const isCurrent = c.id === activeClinicId;
                                const isPrimary = c.id === 1;
                                const isDhaval = c.doctor_name?.toLowerCase().includes('dhaval');

                                return (
                                    <div 
                                        key={c.id}
                                        className={`p-4 rounded-2xl border transition space-y-3 ${
                                            isCurrent 
                                                ? 'bg-teal-50/40 border-teal-300 shadow-xs' 
                                                : 'bg-white border-slate-200/90 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white font-bold text-base flex items-center justify-center shadow-xs flex-shrink-0">
                                                    {c.doctor_name?.charAt(0) || 'C'}
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                                                            {c.name}
                                                        </h4>
                                                        {isPrimary && (
                                                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                                                                Primary Master
                                                            </span>
                                                        )}
                                                        {isCurrent && (
                                                            <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-extrabold text-[10px] flex items-center gap-1">
                                                                <Check className="w-3 h-3" /> Active Now
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-600 font-bold mt-0.5">
                                                        👨‍⚕️ {c.doctor_name} {c.qualification ? `(${c.qualification})` : ''}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 font-medium">
                                                        📍 {c.city || 'Botad'} • ફી: ₹{c.default_consultation_fee || 300} • 📞 {c.phone || 'નંબર નથી'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                                                <button
                                                    onClick={() => handleOpenEdit(c)}
                                                    className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer"
                                                    title="Edit Clinic"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>

                                                {!isPrimary && (
                                                    <button
                                                        onClick={() => handleDeleteClinic(c.id)}
                                                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                                                        title="Delete Clinic"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Telegram Sync & Login Credentials Pill */}
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                                            
                                            {/* Telegram Username Row */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <Send className="w-3.5 h-3.5 text-blue-500" />
                                                    <span className="font-bold text-slate-600">Telegram Sync:</span>
                                                    {telegramEditId === c.id ? (
                                                        <div className="flex items-center space-x-1.5">
                                                            <input
                                                                type="text"
                                                                value={quickTelegramVal}
                                                                onChange={(e) => setQuickTelegramVal(e.target.value)}
                                                                placeholder="@username"
                                                                className="px-2 py-0.5 rounded-lg border border-blue-400 text-xs font-bold bg-white"
                                                            />
                                                            <button 
                                                                onClick={() => handleQuickSaveTelegram(c)}
                                                                className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-bold text-[10px]"
                                                            >
                                                                Save
                                                            </button>
                                                            <button 
                                                                onClick={() => setTelegramEditId(null)}
                                                                className="p-0.5 text-slate-400 text-xs"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="font-extrabold text-blue-600">
                                                            {c.telegram_username ? `@${c.telegram_username}` : 'Not Linked Yet'}
                                                        </span>
                                                    )}
                                                </div>

                                                {telegramEditId !== c.id && (
                                                    <button
                                                        onClick={() => {
                                                            setTelegramEditId(c.id);
                                                            setQuickTelegramVal(c.telegram_username || '');
                                                        }}
                                                        className="text-[10px] font-extrabold text-blue-600 hover:underline cursor-pointer"
                                                    >
                                                        {c.telegram_username ? 'Edit' : '+ લિંક કરો'}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Doctor Direct Login Info */}
                                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                                                <div className="flex items-center space-x-1.5">
                                                    <Key className="w-3 h-3 text-slate-400" />
                                                    <span>લોગિન વિગત:</span>
                                                    <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-slate-800">
                                                        User: {isDhaval ? 'dhaval' : c.doctor_name?.toLowerCase().replace(/[^a-z]/g, '')}
                                                    </code>
                                                    <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-slate-800">
                                                        Pass: 123456
                                                    </code>
                                                </div>

                                                {!isCurrent && (
                                                    <button
                                                        onClick={() => {
                                                            onSelectClinic(c.id);
                                                            onClose();
                                                        }}
                                                        className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] flex items-center space-x-1 shadow-2xs active:scale-95 transition cursor-pointer"
                                                    >
                                                        <span>Switch to Clinic</span>
                                                        <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* VIEW: ADD OR EDIT CLINIC FORM */}
                    {(viewMode === 'add' || viewMode === 'edit') && (
                        <form onSubmit={handleSaveClinic} className="space-y-3 text-xs bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                            
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                    {viewMode === 'edit' ? `ક્લિનિક સુધારો: ${editingClinic?.name}` : '+ નવું ક્લિનિક ઉમેરો'}
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                                >
                                    પાછા જાઓ
                                </button>
                            </div>

                            {errorMsg && (
                                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs flex items-center space-x-1.5">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">ક્લિનિકનું નામ *</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="દા.ત. શિવાનંદ ક્લિનિક / City Health Clinic"
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">ડૉક્ટરનું નામ *</label>
                                    <input
                                        type="text"
                                        required
                                        value={doctorName}
                                        onChange={(e) => setDoctorName(e.target.value)}
                                        placeholder="દા.ત. Dr. Patel / Dr. Sharma"
                                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">ડિગ્રી (Qualification)</label>
                                    <input
                                        type="text"
                                        value={qualification}
                                        onChange={(e) => setQualification(e.target.value)}
                                        placeholder="દા.ત. MBBS, MD / BAMS"
                                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">સંપર્ક નંબર (Phone)</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="૧૦ અંકનો મોબાઈલ નંબર"
                                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">શહેર (City)</label>
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        placeholder="દા.ત. અમદાવાદ / સુરત / બોટાદ"
                                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">ઓપીડી કન્સલ્ટેશન ફી (₹)</label>
                                    <input
                                        type="number"
                                        value={defaultFee}
                                        onChange={(e) => setDefaultFee(e.target.value)}
                                        placeholder="300"
                                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Telegram Username</label>
                                    <input
                                        type="text"
                                        value={telegramUsername}
                                        onChange={(e) => setTelegramUsername(e.target.value)}
                                        placeholder="દા.ત. @doctor_username"
                                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">સ્પેશિયાલિટી (Specialization)</label>
                                <input
                                    type="text"
                                    value={specialization}
                                    onChange={(e) => setSpecialization(e.target.value)}
                                    placeholder="General Physician & Consulting Doctor"
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                                />
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                >
                                    રદ કરો
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
                                >
                                    {isSaving ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>સેવ થાય છે...</span>
                                        </>
                                    ) : (
                                        <span>{viewMode === 'edit' ? 'ફેરફાર સેવ કરો' : 'ક્લિનિક બનાવો'}</span>
                                    )}
                                </button>
                            </div>

                        </form>
                    )}

                </div>

            </div>
        </div>
    );
}
