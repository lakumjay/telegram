import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    Search, 
    Camera, 
    Phone, 
    User, 
    Calendar, 
    Pill, 
    ChevronRight, 
    X, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle,
    Activity,
    Plus,
    UserPlus,
    Eye,
    ArrowLeft,
    PhoneCall
} from 'lucide-react';

import PatientDetailModal from './PatientDetailModal';

export default function DoctorPatientManager({ 
    onOpenVoiceCall, 
    activeClinicId = 1,
    onBack = null,
    onOpenNewBill = null
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPeriod, setFilterPeriod] = useState('All'); // 'All' | 'Today' | 'This Week' | 'This Month'
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [patientList, setPatientList] = useState([]);
    const [isLoadingList, setIsLoadingList] = useState(false);

    // New Patient Modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newPatientName, setNewPatientName] = useState('');
    const [newPatientPhone, setNewPatientPhone] = useState('');
    const [newPatientAge, setNewPatientAge] = useState('');
    const [newPatientGender, setNewPatientGender] = useState('Male');
    const [newPatientCity, setNewPatientCity] = useState('');
    const [newPatientDiagnosis, setNewPatientDiagnosis] = useState('');
    const [isSavingNew, setIsSavingNew] = useState(false);

    const searchDebounceRef = useRef(null);

    useEffect(() => {
        loadPatients();
    }, [activeClinicId]);

    const loadPatients = async () => {
        setIsLoadingList(true);
        try {
            const res = await axios.get(`/api/patients?clinic_id=${activeClinicId}`);
            if (res.data?.success) {
                setPatientList(res.data.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load patients:', err);
        } finally {
            setIsLoadingList(false);
        }
    };

    // Fast 150ms Debounced Suggestion Search
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);

        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }

        if (!val.trim()) {
            setSuggestions([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchDebounceRef.current = setTimeout(async () => {
            try {
                const res = await axios.get(`/api/patients/search?clinic_id=${activeClinicId}&query=${encodeURIComponent(val.trim())}`);
                if (res.data?.success) {
                    setSuggestions(res.data.patients || []);
                }
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setIsSearching(false);
            }
        }, 150);
    };

    const handleSelectPatient = (patient) => {
        setSuggestions([]);
        setSelectedPatientId(patient.id);
        setIsDetailModalOpen(true);
    };

    const handleCreatePatient = async (e) => {
        e.preventDefault();
        if (!newPatientName.trim()) return;

        setIsSavingNew(true);
        try {
            const res = await axios.post('/api/patients', {
                name: newPatientName,
                phone: newPatientPhone,
                age: newPatientAge,
                gender: newPatientGender,
                city: newPatientCity,
                last_diagnosis: newPatientDiagnosis,
                clinic_id: activeClinicId
            });

            if (res.data?.success) {
                setIsAddModalOpen(false);
                setNewPatientName('');
                setNewPatientPhone('');
                setNewPatientAge('');
                setNewPatientCity('');
                setNewPatientDiagnosis('');
                loadPatients();
            }
        } catch (err) {
            console.error('Error creating patient:', err);
        } finally {
            setIsSavingNew(false);
        }
    };

    // Filter patients by period & search query
    const filteredPatients = patientList.filter(p => {
        // Query match
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = p.name?.toLowerCase().includes(q);
            const matchPhone = p.phone?.includes(q);
            if (!matchName && !matchPhone) return false;
        }

        // Period filter
        if (filterPeriod === 'Today') {
            const todayStr = new Date().toISOString().split('T')[0];
            return p.last_visit_date && p.last_visit_date.startsWith(todayStr);
        }
        return true;
    });

    const formatVisitDate = (dateStr) => {
        if (!dateStr) return 'Today';
        const d = new Date(dateStr);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Today';
        return d.toLocaleDateString('gu-IN', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="space-y-4 max-w-xl mx-auto pb-24 px-1 sm:px-0">
            
            {/* 1. Header matching Screen 4 */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="w-9 h-9 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <div>
                        <h2 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                            Patients
                        </h2>
                        <p className="text-[11px] text-slate-400 font-medium">
                            {patientList.length} દર્દીઓ નોંધાયેલા છે
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-9 h-9 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs transition active:scale-95 cursor-pointer"
                        title="Add Patient"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* 2. Search Input matching Screen 4 */}
            <div className="relative">
                <div className="relative flex items-center">
                    <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="નામ અથવા મોબાઈલ નંબર શોધો..."
                        className="w-full bg-white border border-slate-200 focus:border-emerald-600 rounded-2xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 font-medium shadow-2xs focus:outline-none transition"
                    />
                    {isSearching ? (
                        <div className="absolute right-3.5">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        </div>
                    ) : searchQuery ? (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSuggestions([]);
                            }}
                            className="absolute right-3 p-1 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    ) : null}
                </div>

                {/* Instant Suggestion Dropdown */}
                {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto animate-in fade-in">
                        <div className="bg-slate-50 px-3.5 py-1.5 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                            <span>શોધ પરિણામો ({suggestions.length})</span>
                            <span className="text-[10px] text-emerald-700">સિલેક્ટ કરો</span>
                        </div>
                        {suggestions.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => handleSelectPatient(p)}
                                className="p-3 hover:bg-emerald-50/60 cursor-pointer transition flex items-center justify-between"
                            >
                                <div className="space-y-0.5">
                                    <p className="font-bold text-xs text-slate-800">{p.name}</p>
                                    <p className="text-[10px] text-slate-400">📞 {p.phone || 'નંબર નથી'}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. Filter Chips matching Screen 4: All, Today, This Week, This Month */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                {['All', 'Today', 'This Week', 'This Month'].map(chip => (
                    <button
                        key={chip}
                        type="button"
                        onClick={() => setFilterPeriod(chip)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition active:scale-95 cursor-pointer flex-shrink-0 ${
                            filterPeriod === chip
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                        }`}
                    >
                        {chip}
                    </button>
                ))}
            </div>

            {/* 4. Patient Cards List matching Screen 4 */}
            <div className="space-y-2.5">
                {isLoadingList ? (
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                        <p className="text-xs text-slate-400 font-bold">દર્દીઓ લોડ થઈ રહ્યા છે...</p>
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                            <User className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-slate-500 font-bold">કોઈ દર્દી મળ્યા નથી.</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                        >
                            + નવો દર્દી ઉમેરો
                        </button>
                    </div>
                ) : (
                    filteredPatients.map(patient => (
                        <div
                            key={patient.id}
                            className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-xs transition flex items-center justify-between"
                        >
                            <div 
                                onClick={() => handleSelectPatient(patient)}
                                className="flex items-center space-x-3 cursor-pointer flex-1"
                            >
                                <div className="w-10 h-10 rounded-2xl bg-emerald-100/70 text-emerald-800 font-bold text-sm flex items-center justify-center flex-shrink-0">
                                    {patient.name.charAt(0)}
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                                        {patient.name}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 font-medium">
                                        {patient.phone || '9876543210'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400">
                                        Last Visit: <span className="text-emerald-700">{formatVisitDate(patient.last_visit_date)}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Action Icons matching Screen 4: Call & View Eye */}
                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                                <a
                                    href={`tel:${patient.phone}`}
                                    className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition"
                                    title="Call Patient"
                                >
                                    <Phone className="w-4 h-4" />
                                </a>

                                <button
                                    onClick={() => handleSelectPatient(patient)}
                                    className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition cursor-pointer"
                                    title="View Patient Details"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Comprehensive Patient Details & Photo Management Modal */}
            <PatientDetailModal
                patientId={selectedPatientId}
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedPatientId(null);
                }}
                onOpenVoiceCall={onOpenVoiceCall}
                onOpenNewBill={onOpenNewBill}
                onPatientUpdated={() => {
                    loadPatients();
                }}
            />

            {/* Add New Patient Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-extrabold text-sm text-slate-900">નવો દર્દી ઉમેરો (Add Patient)</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePatient} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-slate-600 mb-1">દર્દીનું નામ *</label>
                                <input
                                    type="text"
                                    required
                                    value={newPatientName}
                                    onChange={(e) => setNewPatientName(e.target.value)}
                                    placeholder="દર્દીનું પૂરું નામ"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">મોબાઈલ નંબર</label>
                                    <input
                                        type="tel"
                                        value={newPatientPhone}
                                        onChange={(e) => setNewPatientPhone(e.target.value)}
                                        placeholder="મોબાઈલ નંબર"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-600 mb-1">ઉંમર</label>
                                    <input
                                        type="number"
                                        value={newPatientAge}
                                        onChange={(e) => setNewPatientAge(e.target.value)}
                                        placeholder="ઉંમર"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-1">તકલીફ (Diagnosis)</label>
                                <input
                                    type="text"
                                    value={newPatientDiagnosis}
                                    onChange={(e) => setNewPatientDiagnosis(e.target.value)}
                                    placeholder="તકલીફ / નિદાન"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                                >
                                    રદ કરો
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingNew}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                                >
                                    {isSavingNew ? 'સેવ થાય છે...' : 'સેવ કરો'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
