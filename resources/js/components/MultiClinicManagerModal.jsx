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
    ShieldCheck,
    History,
    Power,
    Users,
    Receipt,
    Calendar,
    DollarSign,
    Activity,
    Pill,
    ArrowLeft
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

    const [viewMode, setViewMode] = useState('list'); // 'list' | 'add' | 'edit' | 'history'
    const [editingClinic, setEditingClinic] = useState(null);
    const [historyClinic, setHistoryClinic] = useState(null);
    const [historyData, setHistoryData] = useState(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [doctorName, setDoctorName] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [clinicAddress, setClinicAddress] = useState('');
    const [qualification, setQualification] = useState('MBBS, MD');
    const [specialization, setSpecialization] = useState('General Physician & Consulting Doctor');
    const [defaultFee, setDefaultFee] = useState('300');
    const [telegramUsername, setTelegramUsername] = useState('');
    const [status, setStatus] = useState('active');
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
        setClinicAddress('');
        setQualification('MBBS, MD');
        setSpecialization('General Physician & Consulting Doctor');
        setDefaultFee('300');
        setTelegramUsername('');
        setStatus('active');
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
        setClinicAddress(c.clinic_address || '');
        setQualification(c.qualification || 'MBBS, MD');
        setSpecialization(c.specialization || 'General Physician & Consulting Doctor');
        setDefaultFee(c.default_consultation_fee || '300');
        setTelegramUsername(c.telegram_username || '');
        setStatus(c.status || 'active');
        setErrorMsg('');
        setSuccessMsg('');
        setViewMode('edit');
    };

    const handleViewHistory = async (c) => {
        setHistoryClinic(c);
        setIsLoadingHistory(true);
        setViewMode('history');
        try {
            const res = await axios.get(`/api/clinic-accounts/clinics/${c.id}/history`);
            if (res.data?.success) {
                setHistoryData(res.data);
            }
        } catch (err) {
            console.error('Error fetching clinic history', err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleToggleStatus = async (c) => {
        if (c.id === 1) {
            alert('મુખ્ય ક્લિનિક (શ્રીરામ ક્લિનિક) હંમેશા સક્રિય રહેવું જરૂરી છે.');
            return;
        }

        try {
            const res = await axios.post(`/api/clinic-accounts/clinics/${c.id}/toggle-status`);
            if (res.data?.success) {
                if (window.showAppToast) {
                    window.showAppToast(res.data.message || '✅ ક્લિનિક સ્ટેટસ અપડેટ થઈ ગયું!');
                }
                if (onClinicsUpdated) onClinicsUpdated();
                if (historyClinic && historyClinic.id === c.id) {
                    setHistoryClinic(prev => ({ ...prev, status: res.data.new_status }));
                }
            }
        } catch (err) {
            alert(err.response?.data?.message || 'સ્ટેટસ બદલવામાં ક્ષતિ આવી.');
        }
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
                    clinic_address: clinicAddress.trim() || null,
                    qualification: qualification.trim(),
                    specialization: specialization.trim(),
                    default_consultation_fee: parseFloat(defaultFee) || 0,
                    ai_assistant_name: 'Alexa',
                    status: status,
                    telegram_username: telegramUsername.trim() || null
                });

                if (res.data?.success) {
                    if (window.showAppToast) window.showAppToast('✅ ક્લિનિક પ્રોફાઇલ સફળતાપૂર્વક અપડેટ થઈ ગઈ!');
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
                    clinic_address: clinicAddress.trim() || null,
                    qualification: qualification.trim(),
                    specialization: specialization.trim(),
                    default_consultation_fee: parseFloat(defaultFee) || 0,
                    ai_assistant_name: 'Alexa',
                    status: status,
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

    const handleDeleteClinic = async (clinicId, clinicName) => {
        if (!confirm(`⚠️ સાવધાન: શું તમે ખરેખર ક્લિનિક '${clinicName}' અને તેનો તમામ ડેટા (દર્દીઓ, બિલ, સ્ટોક, એપોઇન્ટમેન્ટ્સ) કાયમ માટે ડિલીટ કરવા માંગો છો? આ ક્રિયા પાછી મેળવી શકાશે નહીં.`)) {
            return;
        }

        try {
            const res = await axios.delete(`/api/clinic-accounts/clinics/${clinicId}`);
            if (res.data?.success) {
                if (window.showAppToast) window.showAppToast(res.data.message || '🗑️ ક્લિનિક અને તમામ ડેટા સફળતાપૂર્વક ડિલીટ થઈ ગયો.');
                if (onClinicsUpdated) onClinicsUpdated();
                if (viewMode === 'history') setViewMode('list');
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
            <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 my-4 animate-in fade-in zoom-in-95 max-h-[94vh] flex flex-col overflow-hidden">
                
                {/* 1. Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-xs">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                                    Multi-Clinic Management
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[9px] border border-amber-300">
                                    👑 Super Admin Control
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-medium">
                                બધા ક્લિનિક્સ, હિસ્ટ્રી, સક્રિય/નિષ્ક્રિય સ્ટેટસ અને એડિટ-ડિલીટ
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
                            {clinics.length === 0 ? (
                                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6 space-y-3">
                                    <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
                                    <p className="text-xs font-bold text-slate-500">કોઈ ક્લિનિક મળ્યું નથી.</p>
                                    <button
                                        onClick={handleOpenAdd}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 cursor-pointer"
                                    >
                                        + પહેલું ક્લિનિક ઉમેરો
                                    </button>
                                </div>
                            ) : (
                                clinics.map(c => {
                                    const isCurrent = c.id === activeClinicId;
                                    const isPrimary = c.id === 1;
                                    const isInactive = c.status === 'inactive';
                                    const isDhaval = c.doctor_name?.toLowerCase().includes('dhaval');

                                    return (
                                        <div 
                                            key={c.id}
                                            className={`p-4 rounded-2xl border transition space-y-3 ${
                                                isCurrent 
                                                    ? 'bg-teal-50/50 border-teal-300 shadow-xs' 
                                                    : isInactive
                                                    ? 'bg-slate-50/70 border-slate-200 opacity-90'
                                                    : 'bg-white border-slate-200/90 hover:border-slate-300'
                                            }`}
                                        >
                                            {/* Top info row */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-11 h-11 rounded-2xl font-bold text-base flex items-center justify-center shadow-xs flex-shrink-0 ${
                                                        isInactive
                                                            ? 'bg-slate-300 text-slate-600'
                                                            : 'bg-gradient-to-tr from-teal-600 to-emerald-600 text-white'
                                                    }`}>
                                                        {c.doctor_name?.charAt(0) || 'C'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
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
                                                            {isInactive ? (
                                                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[9px] border border-rose-300 flex items-center gap-1">
                                                                    <Power className="w-2.5 h-2.5 text-rose-600" /> Inactive (નિષ્ક્રિય)
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[9px] border border-emerald-300 flex items-center gap-1">
                                                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Active (સક્રિય)
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

                                                {/* Action Buttons: History, Status Toggle, Edit, Delete */}
                                                <div className="flex items-center space-x-1.5 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleViewHistory(c)}
                                                        className="p-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition cursor-pointer"
                                                        title="ક્લિનિક હિસ્ટ્રી અને એનાલિટિક્સ જુઓ"
                                                    >
                                                        <History className="w-3.5 h-3.5" />
                                                    </button>

                                                    {!isPrimary && (
                                                        <button
                                                            onClick={() => handleToggleStatus(c)}
                                                            className={`p-1.5 rounded-xl border transition cursor-pointer ${
                                                                isInactive
                                                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                                            }`}
                                                            title={isInactive ? 'ક્લિનિક સક્રિય (Active) કરો' : 'ક્લિનિક નિષ્ક્રિય (Inactive) કરો'}
                                                        >
                                                            <Power className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleOpenEdit(c)}
                                                        className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer"
                                                        title="Edit Clinic"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>

                                                    {!isPrimary && (
                                                        <button
                                                            onClick={() => handleDeleteClinic(c.id, c.name)}
                                                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                                                            title="Delete Clinic & all records"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Clinic Real-time Stats & Audit Pill */}
                                            <div className="grid grid-cols-4 gap-1.5 py-1.5 px-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 text-[10px] text-slate-600 font-bold text-center">
                                                <div>
                                                    <span className="text-slate-400 font-medium block">દર્દીઓ</span>
                                                    <span className="text-teal-700 font-extrabold">{c.total_patients ?? 0}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 font-medium block">કુલ બિલ</span>
                                                    <span className="text-slate-800 font-extrabold">{c.total_bills ?? 0}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 font-medium block">ઓપીડી આવક</span>
                                                    <span className="text-emerald-700 font-extrabold">₹{c.total_revenue ?? 0}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 font-medium block">દવા સ્ટોક</span>
                                                    <span className="text-indigo-700 font-extrabold">{c.total_medicines ?? 0} આઇટમ</span>
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
                                                                    className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-bold text-[10px] cursor-pointer"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button 
                                                                    onClick={() => setTelegramEditId(null)}
                                                                    className="p-0.5 text-slate-400 text-xs cursor-pointer"
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

                                                {/* Doctor Direct Login Info & Quick Switch */}
                                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                                                    <div className="flex items-center space-x-1.5">
                                                        <Key className="w-3 h-3 text-slate-400" />
                                                        <span>લોગિન:</span>
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
                                })
                            )}
                        </div>
                    )}

                    {/* VIEW: CLINIC AUDIT & DETAILED HISTORY */}
                    {viewMode === 'history' && historyClinic && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className="inline-flex items-center space-x-1 text-xs text-teal-700 hover:text-teal-900 font-bold cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>બધા ક્લિનિક્સની યાદી પર પાછા જાઓ</span>
                                </button>
                                <span className="text-[11px] font-bold text-slate-400">
                                    જોડાયાની તારીખ: {historyClinic.created_at || 'તાજેતરમાં'}
                                </span>
                            </div>

                            {/* Clinic Summary Card */}
                            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-black text-sm text-slate-900">{historyClinic.name}</h4>
                                        <p className="text-xs font-bold text-teal-800">
                                            👨‍⚕️ {historyClinic.doctor_name} ({historyClinic.qualification || 'MBBS'}) • {historyClinic.specialization || 'General Physician'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            📍 {historyClinic.city || 'Botad'} • 📞 {historyClinic.phone || 'નંબર નથી'} • Telegram: @{historyClinic.telegram_username || 'લિંક નથી'}
                                        </p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <div>
                                            {historyClinic.status === 'inactive' ? (
                                                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black text-[10px] border border-rose-300">
                                                    🔴 Inactive
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] border border-emerald-300">
                                                    🟢 Active
                                                </span>
                                            )}
                                        </div>
                                        {historyClinic.id !== 1 && (
                                            <button
                                                onClick={() => handleToggleStatus(historyClinic)}
                                                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-[10px] transition cursor-pointer"
                                            >
                                                {historyClinic.status === 'inactive' ? 'Active કરો' : 'Inactive કરો'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 6 Key Stats Cards */}
                            {isLoadingHistory ? (
                                <div className="text-center py-6 text-xs text-slate-500 font-bold flex items-center justify-center space-x-2">
                                    <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                                    <span>હિસ્ટ્રી અને આંકડા લોડ થઈ રહ્યા છે...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                                            <Users className="w-4 h-4 text-teal-600 mx-auto mb-1" />
                                            <span className="text-[10px] text-slate-400 font-bold block">કુલ દર્દીઓ</span>
                                            <span className="text-base font-black text-slate-900">{historyData?.stats?.total_patients ?? 0}</span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                                            <Receipt className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                                            <span className="text-[10px] text-slate-400 font-bold block">કુલ બિલ</span>
                                            <span className="text-base font-black text-slate-900">{historyData?.stats?.total_bills ?? 0}</span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                                            <DollarSign className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                                            <span className="text-[10px] text-slate-400 font-bold block">ઓપીડી આવક</span>
                                            <span className="text-base font-black text-emerald-700">₹{historyData?.stats?.total_revenue ?? 0}</span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                                            <Activity className="w-4 h-4 text-rose-600 mx-auto mb-1" />
                                            <span className="text-[10px] text-slate-400 font-bold block">કુલ ખર્ચ</span>
                                            <span className="text-base font-black text-rose-700">₹{historyData?.stats?.total_expenses ?? 0}</span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                                            <Calendar className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                                            <span className="text-[10px] text-slate-400 font-bold block">એપોઇન્ટમેન્ટ્સ</span>
                                            <span className="text-base font-black text-purple-900">{historyData?.stats?.total_appointments ?? 0}</span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                                            <Pill className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                                            <span className="text-[10px] text-slate-400 font-bold block">દવા સ્ટોક</span>
                                            <span className="text-base font-black text-amber-900">{historyData?.stats?.total_medicines ?? 0}</span>
                                        </div>
                                    </div>

                                    {/* Recent Patients */}
                                    <div className="space-y-1.5 pt-2">
                                        <h5 className="font-extrabold text-xs text-slate-800">તાજેતરના દર્દીઓ (Recent Patients):</h5>
                                        {(!historyData?.recent_patients || historyData.recent_patients.length === 0) ? (
                                            <p className="text-[11px] text-slate-400 italic">કોઈ દર્દી રેકોર્ડ મળ્યો નથી.</p>
                                        ) : (
                                            <div className="space-y-1 max-h-36 overflow-y-auto">
                                                {historyData.recent_patients.slice(0, 5).map(pt => (
                                                    <div key={pt.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                                                        <div>
                                                            <p className="font-bold text-slate-900">{pt.name}</p>
                                                            <p className="text-[10px] text-slate-400">{pt.phone || 'નંબર નથી'} • {pt.last_diagnosis || 'સામાન્ય તપાસ'}</p>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-teal-700">ID #{pt.id}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action row */}
                                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                                        <button
                                            onClick={() => handleOpenEdit(historyClinic)}
                                            className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                                        >
                                            ક્લિનિક પ્રોફાઇલ એડિટ કરો
                                        </button>
                                        <button
                                            onClick={() => {
                                                onSelectClinic(historyClinic.id);
                                                onClose();
                                            }}
                                            className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition cursor-pointer"
                                        >
                                            આ ક્લિનિકમાં સ્વિચ કરો →
                                        </button>
                                    </div>
                                </>
                            )}
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

                            <div className="grid grid-cols-2 gap-2.5">
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
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">ક્લિનિક સ્ટેટસ (Status)</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                                    >
                                        <option value="active">🟢 Active (સક્રિય)</option>
                                        <option value="inactive">🔴 Inactive (નિષ્ક્રિય)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">ક્લિનિક સરનામું (Address)</label>
                                <textarea
                                    value={clinicAddress}
                                    onChange={(e) => setClinicAddress(e.target.value)}
                                    placeholder="ક્લિનિકનું સરનામું દાખલ કરો..."
                                    rows={2}
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
