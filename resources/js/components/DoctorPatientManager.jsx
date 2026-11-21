import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    Search, 
    Upload, 
    User, 
    FileText, 
    Calendar, 
    Pill, 
    Clock, 
    AlertCircle, 
    CheckCircle2, 
    Plus, 
    X, 
    Camera, 
    Sparkles, 
    Phone, 
    MapPin, 
    ChevronRight,
    Eye,
    RefreshCw,
    Activity
} from 'lucide-react';

export default function DoctorPatientManager({ onOpenVoiceCall }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedImagePreview, setSelectedImagePreview] = useState(null);
    const [prescriptionFile, setPrescriptionFile] = useState(null);
    const [isProcessingOcr, setIsProcessingOcr] = useState(false);
    const [ocrSuccessData, setOcrSuccessData] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [patientList, setPatientList] = useState([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'recent'

    // Form data for manual overrides if needed
    const [patientNameInput, setPatientNameInput] = useState('');
    const [phoneInput, setPhoneInput] = useState('');
    const [cityInput, setCityInput] = useState('');
    const [notesInput, setNotesInput] = useState('');

    const searchDebounceRef = useRef(null);
    const fileInputRef = useRef(null);

    // Initial load of recent patients
    useEffect(() => {
        loadRecentPatients();
    }, []);

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

    // Ultra-Fast Suggestion Search (Debounced 150ms for instant 10-25ms response)
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
            console.error('Error fetching patient details:', err);
            setSelectedPatient(patient);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPrescriptionFile(file);
        setErrorMessage('');
        setOcrSuccessData(null);

        // Preview image
        const reader = new FileReader();
        reader.onload = (event) => {
            setSelectedImagePreview(event.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleUploadPrescription = async (e) => {
        e.preventDefault();
        if (!prescriptionFile) {
            setErrorMessage('કૃપા કરીને પ્રિસ્ક્રિપ્શન અથવા પેજનો ફોટો પસંદ કરો.');
            return;
        }

        setIsProcessingOcr(true);
        setErrorMessage('');

        const formData = new FormData();
        formData.append('photo', prescriptionFile);
        if (patientNameInput.trim()) formData.append('patient_name', patientNameInput.trim());
        if (phoneInput.trim()) formData.append('phone', phoneInput.trim());
        if (cityInput.trim()) formData.append('city', cityInput.trim());
        if (notesInput.trim()) formData.append('notes', notesInput.trim());

        try {
            const res = await axios.post('/api/patients/upload-prescription', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.success) {
                setOcrSuccessData(res.data);
                setSelectedPatient(res.data.patient);
                loadRecentPatients(); // refresh table
                // Reset inputs
                setPrescriptionFile(null);
                setSelectedImagePreview(null);
                setPatientNameInput('');
                setPhoneInput('');
                setCityInput('');
                setNotesInput('');
                setTimeout(() => {
                    setIsUploadModalOpen(false);
                }, 2000);
            } else {
                setErrorMessage(res.data?.message || 'અપલોડમાં ક્ષતિ આવી.');
            }
        } catch (err) {
            console.error('Upload Error:', err);
            setErrorMessage(err.response?.data?.message || 'સર્વર એરર: ફોટો પ્રોસેસ ન થઈ શક્યો.');
        } finally {
            setIsProcessingOcr(false);
        }
    };

    return (
        <div className="space-y-4 max-w-6xl mx-auto pb-12">
            
            {/* Top Clinic Header & Actions */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                                Doctor Clinic & Patient Records
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                AI Vision OCR
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">
                            ફોટો અપલોડ કરો, પલકવારમાં પેશન્ટની દવા/હિસ્ટ્રી ઓટોમેટિક વાંચો અને કૉલ પર પૂછો.
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {/* Call AI Assistant Button */}
                    <button
                        onClick={onOpenVoiceCall}
                        className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition border border-blue-200 cursor-pointer"
                    >
                        <Phone className="w-4 h-4 text-blue-600" />
                        <span>Voice AI Call</span>
                    </button>

                    {/* Upload Prescription Button */}
                    <button
                        onClick={() => {
                            setOcrSuccessData(null);
                            setErrorMessage('');
                            setIsUploadModalOpen(true);
                        }}
                        className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Upload Prescription Page</span>
                    </button>
                </div>
            </div>

            {/* Smart Real-time Search Box with Live Diagnosis Differences */}
            <div className="relative bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
                <div className="relative flex items-center">
                    <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="દર્દીનું નામ લખો (દા.ત. Jay, રમેશ, પટેલ) અથવા મોબાઇલ નંબર..."
                        className="w-full bg-slate-50 border border-slate-200/90 focus:border-emerald-500 focus:bg-white rounded-xl pl-10 pr-24 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none transition font-medium"
                    />
                    {isSearching ? (
                        <div className="absolute right-3.5 flex items-center space-x-1 text-slate-400 text-xs">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            <span className="text-[11px] font-medium">શોધી રહ્યું છે...</span>
                        </div>
                    ) : searchQuery ? (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSuggestions([]);
                            }}
                            className="absolute right-3 p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    ) : null}
                </div>

                {/* Instant Dropdown Suggestions Popup (Highlighting Duplicate Names with Treatment Differences) */}
                {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                        <div className="bg-slate-50/90 px-3.5 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                            <span>મળેલા દર્દીઓ ({suggestions.length})</span>
                            <span className="text-emerald-700 font-semibold lowercase">તુરંત ઓળખવા માટે છેલ્લી તકલીફ/દવા જુઓ</span>
                        </div>

                        {suggestions.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => handleSelectPatient(p)}
                                className="p-3 sm:px-4 hover:bg-emerald-50/60 transition cursor-pointer flex items-center justify-between group"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-bold text-slate-900 text-sm group-hover:text-emerald-700">
                                            {p.name}
                                        </span>
                                        {p.name_gujarati && p.name_gujarati !== p.name && (
                                            <span className="text-xs text-slate-500 font-medium">
                                                ({p.name_gujarati})
                                            </span>
                                        )}
                                        {p.age && (
                                            <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-medium">
                                                ઉંમર: {p.age}
                                            </span>
                                        )}
                                        {p.city && (
                                            <span className="text-[11px] text-slate-400 flex items-center space-x-0.5">
                                                <MapPin className="w-2.5 h-2.5 inline" />
                                                <span>{p.city}</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Crucial: Distinction between duplicate names (e.g. Fever vs Cough) */}
                                    <div className="flex items-center space-x-1.5 text-xs">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 font-medium text-[11px]">
                                            <Pill className="w-3 h-3 mr-1 text-amber-600" />
                                            <span>છેલ્લી દવા/તકલીફ: {p.last_diagnosis || 'સામાન્ય તપાસ'}</span>
                                        </span>
                                        {p.last_medicines && (
                                            <span className="text-slate-500 text-[11px] truncate max-w-xs">
                                                ({p.last_medicines})
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right flex items-center space-x-2 flex-shrink-0">
                                    {p.last_visit_date && (
                                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                                            {new Date(p.last_visit_date).toLocaleDateString('gu-IN', { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Selected Patient Detailed View (Prescription History & Photo Timeline) */}
            {selectedPatient && (
                <div className="bg-white border-2 border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 animate-in fade-in">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-lg border border-emerald-100">
                                {selectedPatient.name.charAt(0)}
                            </div>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                                        {selectedPatient.name}
                                    </h3>
                                    {selectedPatient.name_gujarati && (
                                        <span className="text-xs text-slate-500">
                                            ({selectedPatient.name_gujarati})
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                                    {selectedPatient.age && <span>ઉંમર: {selectedPatient.age} વર્ષ</span>}
                                    {selectedPatient.gender && <span>• {selectedPatient.gender}</span>}
                                    {selectedPatient.city && <span>• {selectedPatient.city}</span>}
                                    {selectedPatient.phone && <span>• 📞 {selectedPatient.phone}</span>}
                                    <span className="text-emerald-700 font-semibold">• કુલ મુલાકાત: {selectedPatient.total_visits || 1}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedPatient(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Last Prescription Summary Card */}
                    <div className="bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-200/80 rounded-xl p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                            <span className="flex items-center space-x-1">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                                <span>છેલ્લી સારવાર સમરી (AI Extracted):</span>
                            </span>
                            <span className="text-[11px] text-emerald-700 font-normal">
                                તારીખ: {selectedPatient.last_visit_date ? new Date(selectedPatient.last_visit_date).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">
                            {selectedPatient.last_diagnosis || 'સામાન્ય તપાસ'}
                        </p>
                        {selectedPatient.last_medicines && (
                            <p className="text-xs text-slate-600 font-medium">
                                <span className="font-bold text-slate-700">લખેલી દવાઓ:</span> {selectedPatient.last_medicines}
                            </p>
                        )}
                    </div>

                    {/* Prescription Pages Timeline */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>પ્રિસ્ક્રિપ્શન પેજ ફોટા અને મુલાકાત ઇતિહાસ ({selectedPatient.visits?.length || 0})</span>
                        </h4>

                        {selectedPatient.visits && selectedPatient.visits.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {selectedPatient.visits.map((v) => (
                                    <div key={v.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-slate-800 flex items-center space-x-1">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{new Date(v.visit_date).toLocaleDateString('gu-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                            </span>
                                            <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-600">
                                                {v.diagnosis}
                                            </span>
                                        </div>

                                        {/* Prescription Photo thumbnail */}
                                        {v.photo_path && (
                                            <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-black/5 aspect-[4/3] flex items-center justify-center">
                                                <img 
                                                    src={v.photo_path} 
                                                    alt="Prescription" 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                                />
                                                <a 
                                                    href={v.photo_path} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold space-x-1"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    <span>મોટો ફોટો જુઓ</span>
                                                </a>
                                            </div>
                                        )}

                                        {v.medicines && (
                                            <div className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80">
                                                <span className="font-semibold text-slate-800">દવા:</span> {v.medicines}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic">કોઈ જૂની મુલાકાતનો ફોટો ઉપલબ્ધ નથી.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Patients Directory Table & List */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <User className="w-4 h-4 text-emerald-600" />
                        <span>દર્દીઓની યાદી (Recent Patients)</span>
                    </h3>
                    <button 
                        onClick={loadRecentPatients}
                        className="text-xs text-slate-500 hover:text-emerald-700 flex items-center space-x-1"
                    >
                        <RefreshCw className="w-3 h-3" />
                        <span>રિફ્રેશ</span>
                    </button>
                </div>

                {isLoadingList ? (
                    <div className="py-8 text-center text-xs text-slate-400">દર્દીઓ લોડ થઈ રહ્યા છે...</div>
                ) : patientList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">હજી સુધી કોઈ દર્દીનો રેકોર્ડ નથી. ઉપર આપેલા બટનથી પ્રિસ્ક્રિપ્શન ફોટો અપલોડ કરો.</div>
                ) : (
                    <div className="divide-y divide-slate-100 overflow-x-auto">
                        {patientList.map((p) => (
                            <div 
                                key={p.id}
                                onClick={() => handleSelectPatient(p)}
                                className="py-2.5 px-2 hover:bg-slate-50 rounded-xl transition flex items-center justify-between cursor-pointer"
                            >
                                <div className="space-y-0.5">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-bold text-xs sm:text-sm text-slate-800">{p.name}</span>
                                        {p.name_gujarati && p.name_gujarati !== p.name && (
                                            <span className="text-xs text-slate-500">({p.name_gujarati})</span>
                                        )}
                                        {p.city && (
                                            <span className="text-[11px] text-slate-400">• {p.city}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] mr-1">
                                            {p.last_diagnosis || 'સામાન્ય તપાસ'}
                                        </span>
                                        {p.last_medicines && <span className="text-[11px] text-slate-500">({p.last_medicines})</span>}
                                    </p>
                                </div>
                                <div className="text-right flex items-center space-x-2">
                                    <span className="text-[11px] text-slate-400">
                                        {p.last_visit_date ? new Date(p.last_visit_date).toLocaleDateString() : ''}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upload Prescription Page Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in fade-in zoom-in-95">
                        
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center space-x-2.5">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                    <Camera className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                                        Upload Prescription Page Photo
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        AI આપમેળે દર્દીનું નામ, તકલીફ અને દવાઓ વાંચી લેશે.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsUploadModalOpen(false)}
                                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {errorMessage && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {ocrSuccessData && (
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                                <div className="flex items-center space-x-1.5 font-bold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>AI એ સફળતાપૂર્વક વિગત વાંચી લીધી!</span>
                                </div>
                                <p><strong>દર્દી:</strong> {ocrSuccessData.patient?.name} ({ocrSuccessData.patient?.city || 'City N/A'})</p>
                                <p><strong>રોગ/તકલીફ:</strong> {ocrSuccessData.extracted?.diagnosis}</p>
                                <p><strong>દવાઓ:</strong> {ocrSuccessData.extracted?.medicines}</p>
                            </div>
                        )}

                        <form onSubmit={handleUploadPrescription} className="space-y-3.5">
                            {/* Photo Picker */}
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                                    selectedImagePreview ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-300 hover:border-emerald-500 bg-slate-50'
                                }`}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                />

                                {selectedImagePreview ? (
                                    <div className="space-y-2">
                                        <img 
                                            src={selectedImagePreview} 
                                            alt="Prescription preview" 
                                            className="max-h-48 rounded-lg shadow-xs mx-auto object-contain"
                                        />
                                        <p className="text-xs text-emerald-700 font-semibold">ફોટો બદલવા માટે ક્લિક કરો</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5 py-4">
                                        <Camera className="w-8 h-8 text-slate-400 mx-auto" />
                                        <p className="text-xs font-semibold text-slate-700">
                                            પેજનો ફોટો પાડો અથવા ગેલરીમાંથી પસંદ કરો
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            PNG, JPG, WEBP અથવા PDF (Max 20MB)
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Optional Manual Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        દર્દીનું નામ (વૈકલ્પિક - AI જાતે વાંચશે)
                                    </label>
                                    <input
                                        type="text"
                                        value={patientNameInput}
                                        onChange={(e) => setPatientNameInput(e.target.value)}
                                        placeholder="દા.ત. Jay Lakum"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        મોબાઇલ નંબર (વૈકલ્પિક)
                                    </label>
                                    <input
                                        type="text"
                                        value={phoneInput}
                                        onChange={(e) => setPhoneInput(e.target.value)}
                                        placeholder="9898xxxxxx"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    ગામ / સરનામું (વૈકલ્પિક)
                                </label>
                                <input
                                    type="text"
                                    value={cityInput}
                                    onChange={(e) => setCityInput(e.target.value)}
                                    placeholder="દા.ત. બોટાદ, અમદાવાદ"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isProcessingOcr || !prescriptionFile}
                                className={`w-full py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition cursor-pointer ${
                                    isProcessingOcr || !prescriptionFile
                                        ? 'bg-slate-300 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {isProcessingOcr ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>AI પેજ વાંચી રહ્યું છે (Gemini Vision OCR)...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        <span>Upload & Auto-Extract Details</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
