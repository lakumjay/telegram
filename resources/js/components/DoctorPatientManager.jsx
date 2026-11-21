import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    Search, 
    Camera, 
    Phone, 
    Sparkles, 
    User, 
    Calendar, 
    Pill, 
    MapPin, 
    ChevronRight, 
    X, 
    Eye, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle,
    Activity,
    Plus
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
            const res = await axios.get('/api/patients');
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
                const res = await axios.get(`/api/patients/search?query=${encodeURIComponent(val.trim())}`);
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
                // Clear success toast after 4s
                setTimeout(() => setOcrSuccessData(null), 4000);
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
                capture="environment" // Direct mobile camera trigger!
                className="hidden"
            />

            {/* 1. Large 1-Tap Action Buttons (Tailored for Doctor Thumb Ergonomics) */}
            <div className="grid grid-cols-2 gap-3">
                {/* Big Camera Snap Button */}
                <button
                    onClick={() => !isProcessingOcr && fileInputRef.current?.click()}
                    disabled={isProcessingOcr}
                    className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-700/25 flex flex-col items-center justify-center text-center space-y-2 active:scale-95 transition cursor-pointer"
                >
                    {isProcessingOcr ? (
                        <>
                            <RefreshCw className="w-8 h-8 animate-spin" />
                            <div>
                                <p className="font-extrabold text-sm sm:text-base leading-tight">AI સ્કેન કરે છે...</p>
                                <p className="text-[11px] text-emerald-100 mt-0.5">વિગત વાંચી રહ્યો છે</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                                <Camera className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="font-extrabold text-sm sm:text-base leading-tight">પેજનો ફોટો પાડો</p>
                                <p className="text-[11px] text-emerald-100 font-medium mt-0.5">1-Tap Auto AI OCR</p>
                            </div>
                        </>
                    )}
                </button>

                {/* Big Voice AI Call Button */}
                <button
                    onClick={onOpenVoiceCall}
                    className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-700/25 flex flex-col items-center justify-center text-center space-y-2 active:scale-95 transition cursor-pointer"
                >
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                        <Phone className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="font-extrabold text-sm sm:text-base leading-tight">AI વૉઇસ કૉલ</p>
                        <p className="text-[11px] text-blue-100 font-medium mt-0.5">દર્દીની વિગત પૂછો</p>
                    </div>
                </button>
            </div>

            {/* AI OCR Real-time Scan Notification */}
            {ocrSuccessData && (
                <div className="p-4 rounded-3xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 shadow-md space-y-2 animate-in zoom-in-95">
                    <div className="flex items-center space-x-2 font-bold text-sm text-emerald-800">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <span>AI એ નવો રેકોર્ડ આપમેળે સેવ કર્યો!</span>
                    </div>
                    <div className="bg-white/90 rounded-2xl p-3 border border-emerald-200 text-xs space-y-1">
                        <p className="font-bold text-slate-900 text-sm">{ocrSuccessData.patient?.name}</p>
                        <p className="text-amber-800 font-semibold">🩺 તકલીફ: {ocrSuccessData.extracted?.diagnosis || 'સામાન્ય તપાસ'}</p>
                        {ocrSuccessData.extracted?.medicines && (
                            <p className="text-slate-600">💊 દવા: {ocrSuccessData.extracted?.medicines}</p>
                        )}
                    </div>
                </div>
            )}

            {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* 2. Large Touch-Friendly Search Box */}
            <div className="relative">
                <div className="relative flex items-center">
                    <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="દર્દીનું નામ (દા.ત. Jay, રમેશ) અથવા મોબાઈલ..."
                        className="w-full bg-white border-2 border-slate-200/90 focus:border-emerald-600 rounded-2xl pl-12 pr-12 py-3.5 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 font-semibold shadow-xs focus:outline-none transition"
                    />
                    {isSearching ? (
                        <div className="absolute right-4">
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                        </div>
                    ) : searchQuery ? (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSuggestions([]);
                            }}
                            className="absolute right-3.5 p-1.5 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    ) : null}
                </div>

                {/* Instant Suggestion Dropdown (Clear Highlight for Duplicate Names e.g. Fever vs Cough) */}
                {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border-2 border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden divide-y divide-slate-100 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                        <div className="bg-emerald-50/90 px-4 py-2 text-xs font-bold text-emerald-800 flex items-center justify-between">
                            <span>મળેલા દર્દીઓ ({suggestions.length})</span>
                            <span className="text-[11px] font-medium text-emerald-600">તુરંત ઓળખવા છેલ્લી દવા જુઓ</span>
                        </div>

                        {suggestions.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => handleSelectPatient(p)}
                                className="p-3.5 sm:p-4 hover:bg-emerald-50/50 transition cursor-pointer flex items-center justify-between active:bg-emerald-100/50"
                            >
                                <div className="space-y-1 pr-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-extrabold text-slate-900 text-base">
                                            {p.name}
                                        </span>
                                        {p.age && (
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-bold">
                                                {p.age} વર્ષ
                                            </span>
                                        )}
                                        {p.city && (
                                            <span className="text-xs text-slate-400 font-medium">
                                                • {p.city}
                                            </span>
                                        )}
                                    </div>

                                    {/* Distinction pill: Fever vs Cough */}
                                    <div className="flex items-center space-x-1.5 text-xs">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/90 font-bold text-xs">
                                            <Pill className="w-3.5 h-3.5 mr-1 text-amber-600 flex-shrink-0" />
                                            <span>છેલ્લે: {p.last_diagnosis || 'સામાન્ય તપાસ'}</span>
                                        </span>
                                        {p.last_medicines && (
                                            <span className="text-slate-500 text-xs truncate max-w-[140px] sm:max-w-xs">
                                                ({p.last_medicines})
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. Selected Patient History Card with Full Prescription Photo */}
            {selectedPatient && (
                <div className="bg-white border-2 border-emerald-500 rounded-3xl p-4 sm:p-5 shadow-md space-y-4 animate-in fade-in">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xl">
                                {selectedPatient.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-extrabold text-lg text-slate-900">
                                    {selectedPatient.name}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {selectedPatient.age ? `${selectedPatient.age} વર્ષ` : ''} {selectedPatient.city ? `• ${selectedPatient.city}` : ''} {selectedPatient.phone ? `• 📞 ${selectedPatient.phone}` : ''}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedPatient(null)}
                            className="p-1.5 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Quick Medicine Pill */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 space-y-1">
                        <p className="text-xs font-bold text-emerald-900">છેલ્લી તકલીફ & સારવાર:</p>
                        <p className="font-black text-sm text-slate-900">{selectedPatient.last_diagnosis || 'સામાન્ય તપાસ'}</p>
                        {selectedPatient.last_medicines && (
                            <p className="text-xs font-semibold text-slate-600">લખેલી દવા: {selectedPatient.last_medicines}</p>
                        )}
                    </div>

                    {/* Prescription Photos Timeline */}
                    <div className="space-y-2 pt-1">
                        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                            પ્રિસ્ક્રિપ્શન પેજ ફોટા ({selectedPatient.visits?.length || 0})
                        </p>

                        <div className="space-y-3">
                            {selectedPatient.visits?.map((v) => (
                                <div key={v.id} className="border border-slate-200 rounded-2xl p-3 bg-slate-50/70 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                        <span>📅 {new Date(v.visit_date).toLocaleDateString('gu-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        <span className="bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-600 text-[11px]">
                                            {v.diagnosis}
                                        </span>
                                    </div>

                                    {v.photo_path && (
                                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-black/5 aspect-[4/3]">
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
                                        <p className="text-xs text-slate-600 bg-white p-2 rounded-xl border border-slate-200">
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
            <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        <span>દર્દીઓની યાદી (Recent Patients)</span>
                    </h3>
                    <button 
                        onClick={loadRecentPatients}
                        className="text-xs font-bold text-emerald-700 flex items-center space-x-1"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>રિફ્રેશ</span>
                    </button>
                </div>

                {isLoadingList ? (
                    <div className="py-8 text-center text-xs text-slate-400">દર્દીઓ લોડ થઈ રહ્યા છે...</div>
                ) : patientList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                        કોઈ દર્દી નથી. ઉપરના લીલા બટનથી પેજનો ફોટો પાડો.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {patientList.map((p) => (
                            <div 
                                key={p.id}
                                onClick={() => handleSelectPatient(p)}
                                className="py-3 px-1 hover:bg-slate-50 transition flex items-center justify-between cursor-pointer active:scale-[0.99]"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-extrabold text-sm sm:text-base text-slate-900">
                                            {p.name}
                                        </span>
                                        {p.city && (
                                            <span className="text-xs text-slate-400 font-medium">
                                                • {p.city}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2 text-xs">
                                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200/80">
                                            {p.last_diagnosis || 'સામાન્ય તપાસ'}
                                        </span>
                                        {p.last_medicines && (
                                            <span className="text-slate-500 text-xs truncate max-w-[160px]">
                                                {p.last_medicines}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
