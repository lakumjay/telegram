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
    UserPlus
} from 'lucide-react';

export default function DoctorPatientManager({ onOpenVoiceCall, activeClinicId = 1 }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientList, setPatientList] = useState([]);
    const [isLoadingList, setIsLoadingList] = useState(false);

    // 1-Tap Camera Upload State
    const [isProcessingOcr, setIsProcessingOcr] = useState(false);
    const [ocrSuccessData, setOcrSuccessData] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    const searchDebounceRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadRecentPatients();
    }, [activeClinicId]);

    const loadRecentPatients = async () => {
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

    // Fast 150ms Debounced Suggestion Search (Instant Result)
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

    const handleSelectPatient = async (patient) => {
        setSuggestions([]);
        setSearchQuery(patient.name);
        try {
            const res = await axios.get(`/api/patients/${patient.id}`);
            if (res.data?.success) {
                setSelectedPatient(res.data.patient);
            }
        } catch (err) {
            setSelectedPatient(patient);
        }
    };

    // 1-Tap Direct Camera Photo Capture & Immediate AI Upload
    const handleDirectPhotoSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingOcr(true);
        setErrorMessage('');
        setOcrSuccessData(null);

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('clinic_id', activeClinicId);

        try {
            const res = await axios.post('/api/patients/upload-prescription', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.success) {
                setOcrSuccessData(res.data);
                setSelectedPatient(res.data.patient);
                loadRecentPatients();
                // Clear success toast after 3s
                setTimeout(() => setOcrSuccessData(null), 3500);
            } else {
                setErrorMessage(res.data?.message || 'ફોટો પ્રોસેસ ન થઈ શક્યો.');
            }
        } catch (err) {
            setErrorMessage(err.response?.data?.message || 'સર્વર કનેક્શનમાં ક્ષતિ આવી.');
        } finally {
            setIsProcessingOcr(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-4 max-w-lg mx-auto pb-24 px-1 sm:px-0">
            
            {/* Hidden native camera file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleDirectPhotoSelect}
                accept="image/*,application/pdf"
                capture="environment" // Direct camera
                className="hidden"
            />

            {/* 1. Normal, Clean, Professional Action Bar (No Loud/Over-saturated Gradients) */}
            <div className="grid grid-cols-2 gap-2.5">
                {/* Clean Snap Button */}
                <button
                    onClick={() => !isProcessingOcr && fileInputRef.current?.click()}
                    disabled={isProcessingOcr}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 shadow-2xs flex items-center space-x-3 text-left transition active:scale-[0.98] cursor-pointer group"
                >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                        {isProcessingOcr ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    </div>
                    <div className="truncate">
                        <p className="font-bold text-slate-800 text-xs sm:text-sm leading-tight truncate">
                            {isProcessingOcr ? 'AI સ્કેન કરે છે...' : 'પેજનો ફોટો પાડો'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">1-Tap Auto Scan</p>
                    </div>
                </button>

                {/* Clean AI Call Button */}
                <button
                    onClick={onOpenVoiceCall}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 shadow-2xs flex items-center space-x-3 text-left transition active:scale-[0.98] cursor-pointer group"
                >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                        <Phone className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                        <p className="font-bold text-slate-800 text-xs sm:text-sm leading-tight truncate">AI વૉઇસ કૉલ</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">દર્દીની વિગત પૂછો</p>
                    </div>
                </button>
            </div>

            {/* AI OCR Notification Toast */}
            {ocrSuccessData && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1 animate-in zoom-in-95">
                    <div className="flex items-center space-x-1.5 font-bold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>AI એ નવો રેકોર્ડ સેવ કર્યો: {ocrSuccessData.patient?.name}</span>
                    </div>
                    <p className="text-slate-600">
                        🩺 <strong>તકલીફ:</strong> {ocrSuccessData.extracted?.diagnosis || 'સામાન્ય તપાસ'} {ocrSuccessData.extracted?.medicines ? `• 💊 ${ocrSuccessData.extracted?.medicines}` : ''}
                    </p>
                </div>
            )}

            {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* 2. Clean, Normal Sleek Search Box */}
            <div className="relative">
                <div className="relative flex items-center">
                    <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="દર્દીનું નામ (દા.ત. Jay, રમેશ) અથવા મોબાઈલ..."
                        className="w-full bg-white border border-slate-200 focus:border-emerald-600 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 font-medium shadow-2xs focus:outline-none transition"
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

                {/* Instant Suggestion Dropdown (Clear Highlight for Duplicate Names e.g. Fever vs Cough) */}
                {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto animate-in fade-in">
                        <div className="bg-slate-50 px-3.5 py-1.5 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                            <span>મળેલા દર્દીઓ ({suggestions.length})</span>
                            <span className="text-emerald-700 font-semibold">ઓળખવા છેલ્લી દવા જુઓ</span>
                        </div>

                        {suggestions.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => handleSelectPatient(p)}
                                className="p-3 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
                            >
                                <div className="space-y-0.5 pr-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                            {p.name}
                                        </span>
                                        {p.age && (
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                                {p.age} yr
                                            </span>
                                        )}
                                        {p.city && (
                                            <span className="text-[11px] text-slate-400 font-normal">
                                                • {p.city}
                                            </span>
                                        )}
                                    </div>

                                    {/* Distinction pill: Fever vs Cough */}
                                    <div className="flex items-center space-x-1.5 text-xs">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                                            <Pill className="w-3 h-3 mr-1 text-amber-600" />
                                            <span>{p.last_diagnosis || 'સામાન્ય તપાસ'}</span>
                                        </span>
                                        {p.last_medicines && (
                                            <span className="text-slate-500 text-[11px] truncate max-w-[140px]">
                                                ({p.last_medicines})
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. Selected Patient History Card with Full Prescription Photo */}
            {selectedPatient && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 animate-in fade-in">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center space-x-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center justify-center font-bold text-sm">
                                {selectedPatient.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                                    {selectedPatient.name}
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    {selectedPatient.age ? `${selectedPatient.age} વર્ષ` : ''} {selectedPatient.city ? `• ${selectedPatient.city}` : ''} {selectedPatient.phone ? `• 📞 ${selectedPatient.phone}` : ''}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedPatient(null)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Quick Medicine Pill */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-0.5 text-xs">
                        <p className="text-[11px] font-bold text-slate-600">છેલ્લી તકલીફ & સારવાર:</p>
                        <p className="font-bold text-slate-900">{selectedPatient.last_diagnosis || 'સામાન્ય તપાસ'}</p>
                        {selectedPatient.last_medicines && (
                            <p className="text-[11px] text-slate-500">દવા: {selectedPatient.last_medicines}</p>
                        )}
                    </div>

                    {/* Prescription Photos Timeline */}
                    <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            પ્રિસ્ક્રિપ્શન પેજ ફોટા ({selectedPatient.visits?.length || 0})
                        </p>

                        <div className="space-y-2.5">
                            {selectedPatient.visits?.map((v) => (
                                <div key={v.id} className="border border-slate-200 rounded-xl p-2.5 bg-slate-50/50 space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                                        <span>📅 {new Date(v.visit_date).toLocaleDateString('gu-IN', { day: 'numeric', month: 'short' })}</span>
                                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 text-[10px]">
                                            {v.diagnosis}
                                        </span>
                                    </div>

                                    {v.photo_path && (
                                        <div className="rounded-lg overflow-hidden border border-slate-200 aspect-[4/3]">
                                            <a href={v.photo_path} target="_blank" rel="noreferrer">
                                                <img 
                                                    src={v.photo_path} 
                                                    alt="Prescription" 
                                                    className="w-full h-full object-cover"
                                                />
                                            </a>
                                        </div>
                                    )}

                                    {v.medicines && (
                                        <p className="text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-200">
                                            <span className="font-bold">દવા:</span> {v.medicines}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Recent Patients Card Directory */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center space-x-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-600" />
                        <span>દર્દીઓની યાદી (Recent Patients)</span>
                    </h3>
                    <button 
                        onClick={loadRecentPatients}
                        className="text-xs font-semibold text-emerald-700 flex items-center space-x-1"
                    >
                        <RefreshCw className="w-3 h-3" />
                        <span>રિફ્રેશ</span>
                    </button>
                </div>

                {isLoadingList ? (
                    <div className="py-6 text-center text-xs text-slate-400">દર્દીઓ લોડ થઈ રહ્યા છે...</div>
                ) : patientList.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                        આ ક્લિનિકમાં કોઈ દર્દી નોંધાયેલ નથી. ઉપરના બટનથી પેજનો ફોટો પાડો.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {patientList.map((p) => (
                            <div 
                                key={p.id}
                                onClick={() => handleSelectPatient(p)}
                                className="py-2.5 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer"
                            >
                                <div className="space-y-0.5">
                                    <div className="flex items-center space-x-1.5">
                                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                                            {p.name}
                                        </span>
                                        {p.city && (
                                            <span className="text-[11px] text-slate-400">
                                                • {p.city}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-1.5 text-xs">
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[10px] border border-emerald-200">
                                            {p.last_diagnosis || 'સામાન્ય તપાસ'}
                                        </span>
                                        {p.last_medicines && (
                                            <span className="text-slate-500 text-[11px] truncate max-w-[150px]">
                                                {p.last_medicines}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
