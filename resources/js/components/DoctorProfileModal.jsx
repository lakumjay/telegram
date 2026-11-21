import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    X, 
    Upload, 
    Camera, 
    CheckCircle2, 
    AlertCircle, 
    Building2, 
    User, 
    Phone, 
    Mail, 
    MapPin, 
    GraduationCap, 
    FileBadge, 
    IndianRupee, 
    Bot,
    RefreshCw,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';

export default function DoctorProfileModal({ 
    isOpen, 
    onClose, 
    clinic, 
    onUpdated 
}) {
    if (!isOpen || !clinic) return null;

    const [currentStep, setCurrentStep] = useState(1); // 1 = Basic Info, 2 = Contact & Branding

    const [name, setName] = useState(clinic.name || '');
    const [doctorName, setDoctorName] = useState(clinic.doctor_name || '');
    const [phone, setPhone] = useState(clinic.phone || '');
    const [email, setEmail] = useState(clinic.email || '');
    const [city, setCity] = useState(clinic.city || '');
    const [clinicAddress, setClinicAddress] = useState(clinic.clinic_address || '');
    const [specialization, setSpecialization] = useState(clinic.specialization || 'General Physician');
    const [qualification, setQualification] = useState(clinic.qualification || 'MBBS, MD');
    const [registrationNumber, setRegistrationNumber] = useState(clinic.registration_number || '');
    const [defaultFee, setDefaultFee] = useState(clinic.default_consultation_fee || '300');
    const [aiAssistantName, setAiAssistantName] = useState(clinic.ai_assistant_name || 'Alexa');

    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(clinic.logo_url || null);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

    const fileInputRef = useRef(null);

    const handleLogoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoFile(file);

        const reader = new FileReader();
        reader.onload = (event) => {
            setLogoPreview(event.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setStatusMessage({ type: 'error', text: 'ક્લિનિકનું નામ દાખલ કરો.' });
            return;
        }
        if (!doctorName.trim()) {
            setStatusMessage({ type: 'error', text: 'ડૉક્ટરનું નામ દાખલ કરો.' });
            return;
        }
        setStatusMessage({ type: '', text: '' });
        setCurrentStep(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setStatusMessage({ type: '', text: '' });

        const formData = new FormData();
        formData.append('name', name);
        formData.append('doctor_name', doctorName);
        formData.append('phone', phone);
        formData.append('email', email);
        formData.append('city', city);
        formData.append('clinic_address', clinicAddress);
        formData.append('specialization', specialization);
        formData.append('qualification', qualification);
        formData.append('registration_number', registrationNumber);
        formData.append('default_consultation_fee', defaultFee);
        formData.append('ai_assistant_name', aiAssistantName);

        if (logoFile) {
            formData.append('logo', logoFile);
        }

        try {
            const res = await axios.post(`/api/clinic-accounts/clinics/${clinic.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.success) {
                setStatusMessage({ type: 'success', text: '✅ પ્રોફાઇલ સફળતાપૂર્વક અપડેટ થઈ ગઈ!' });
                if (onUpdated) onUpdated(res.data.clinic);
                setTimeout(() => {
                    onClose();
                }, 1000);
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.response?.data?.message || 'પ્રોફાઇલ સેવ કરવામાં ક્ષતિ આવી.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] my-4 animate-in fade-in zoom-in-95 overflow-hidden">
                
                {/* 1. STICKY MODAL HEADER with Clear Close Button & Step Tabs */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex-shrink-0 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                                    Doctor & Clinic Profile
                                </h3>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    {clinic.name || 'ક્લિનિક પ્રોફાઇલ'}
                                </p>
                            </div>
                        </div>

                        {/* Top Close (X) Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition active:scale-90 cursor-pointer"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Step Tabs Indicator (Step 1 & Step 2) */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                                currentStep === 1
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                        >
                            <span>૧. ક્લિનિક & ડૉક્ટર વિગત</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setCurrentStep(2)}
                            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                                currentStep === 2
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                        >
                            <span>૨. લોગો & ફી સેટિંગ્સ</span>
                        </button>
                    </div>
                </div>

                {/* 2. SCROLLABLE FORM BODY (No content ever cut off) */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                    
                    {statusMessage.text && (
                        <div className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                            statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                            <span>{statusMessage.text}</span>
                        </div>
                    )}

                    {/* STEP 1: Basic Clinic & Doctor Details */}
                    {currentStep === 1 && (
                        <div className="space-y-3.5 text-xs animate-in fade-in">
                            <div>
                                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>ક્લિનિકનું નામ (Clinic Name) *</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="ક્લિનિકનું પૂરું નામ લખો"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>મુખ્ય ડૉક્ટરનું નામ (Doctor Name) *</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={doctorName}
                                    onChange={(e) => setDoctorName(e.target.value)}
                                    placeholder="ડૉક્ટરનું પૂરું નામ લખો"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs sm:text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                        <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>ડિગ્રી / લાયકાત (Degree)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={qualification}
                                        onChange={(e) => setQualification(e.target.value)}
                                        placeholder="મેડિકલ ડિગ્રી લખો"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-600 text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                        <FileBadge className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>રજિસ્ટ્રેશન નંબર (Reg. No)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={registrationNumber}
                                        onChange={(e) => setRegistrationNumber(e.target.value)}
                                        placeholder="મેડિકલ કાઉન્સિલ નંબર"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-600 text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    વિશેષજ્ઞતા (Specialization)
                                </label>
                                <input
                                    type="text"
                                    value={specialization}
                                    onChange={(e) => setSpecialization(e.target.value)}
                                    placeholder="સ્પેશિયાલિટી લખો"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-emerald-600 text-xs"
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Logo, Fees, Contact & AI Settings */}
                    {currentStep === 2 && (
                        <div className="space-y-3.5 text-xs animate-in fade-in">
                            
                            {/* Logo Upload Card */}
                            <div className="flex items-center space-x-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-slate-300 hover:border-emerald-500 flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0"
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleLogoSelect} 
                                        accept="image/*" 
                                        className="hidden" 
                                    />
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Clinic Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="w-6 h-6 text-slate-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="font-extrabold text-slate-800 text-xs">ક્લિનિક લોગો / ફોટો</p>
                                    <p className="text-[10px] text-slate-400">ટોપ હેડર પર આ લોગો દેખાશે</p>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="mt-1.5 px-3 py-1 bg-white border border-slate-200 text-emerald-700 font-bold text-[11px] rounded-lg shadow-2xs hover:bg-emerald-50"
                                    >
                                        ફોટો પસંદ કરો
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                        <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>કન્સલ્ટેશન ફી (₹)</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={defaultFee}
                                        onChange={(e) => setDefaultFee(e.target.value)}
                                        placeholder="ઓપીડી ફી"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-600 text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                        <Bot className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>AI એજન્ટનું નામ</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={aiAssistantName}
                                        onChange={(e) => setAiAssistantName(e.target.value)}
                                        placeholder="કૉલ કરનાર AI નું નામ"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-600 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>મોબાઈલ નંબર (Phone)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="ક્લિનિક સંપર્ક નંબર"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-600 text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>શહેર (City)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        placeholder="શહેરનું નામ"
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-600 text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    ક્લિનિકનું પૂરું સરનામું (Address)
                                </label>
                                <textarea
                                    value={clinicAddress}
                                    onChange={(e) => setClinicAddress(e.target.value)}
                                    rows={2}
                                    placeholder="સરનામું લખો"
                                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-emerald-600 text-xs"
                                />
                            </div>

                        </div>
                    )}

                </div>

                {/* 3. STICKY MODAL FOOTER (Always Visible, Never Cut Off on Any Phone) */}
                <div className="p-3.5 sm:p-4 border-t border-slate-100 flex-shrink-0 bg-slate-50 flex items-center justify-between space-x-2">
                    {currentStep === 1 ? (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold text-xs text-slate-600 transition"
                            >
                                બંધ કરો
                            </button>

                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center space-x-1.5"
                            >
                                <span>આગળ વધો (Next)</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setCurrentStep(1)}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold text-xs text-slate-600 transition flex items-center space-x-1"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>પાછળ</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSaving}
                                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center space-x-1.5"
                            >
                                {isSaving ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>સેવ થાય છે...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>પ્રોફાઇલ સેવ કરો</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
