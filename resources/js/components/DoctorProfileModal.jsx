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
    RefreshCw
} from 'lucide-react';

export default function DoctorProfileModal({ 
    isOpen, 
    onClose, 
    clinic, 
    onUpdated 
}) {
    if (!isOpen || !clinic) return null;

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
                setStatusMessage({ type: 'success', text: '✅ ક્લિનિક પ્રોફાઇલ સફળતાપૂર્વક અપડેટ થઈ ગઈ!' });
                if (onUpdated) onUpdated(res.data.clinic);
                setTimeout(() => {
                    onClose();
                }, 1200);
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.response?.data?.message || 'પ્રોફાઇલ સેવ કરવામાં ક્ષતિ આવી.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 my-8 animate-in fade-in zoom-in-95">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                                Customize Doctor & Clinic Profile
                            </h3>
                            <p className="text-[11px] text-slate-400">ક્લિનિક લોગો, નામ, ડિગ્રી અને ફી સેટ કરો</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {statusMessage.text && (
                    <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                        statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                        {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                        <span>{statusMessage.text}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                    
                    {/* Clinic Logo Upload Picker */}
                    <div className="flex items-center space-x-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
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
                            <p className="font-bold text-slate-800 text-xs">ક્લિનિક લોગો (Logo)</p>
                            <p className="text-[11px] text-slate-400">PNG, JPG અથવા SVG ફોટો અપલોડ કરો</p>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-1 text-[11px] font-bold text-emerald-700 hover:underline"
                            >
                                ફોટો પસંદ કરો
                            </button>
                        </div>
                    </div>

                    {/* Clinic & Doctor Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">ક્લિનિકનું નામ *</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="દા.ત. શ્રીરામ ક્લિનિક"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">ડૉક્ટરનું પૂરું નામ *</label>
                            <input
                                type="text"
                                required
                                value={doctorName}
                                onChange={(e) => setDoctorName(e.target.value)}
                                placeholder="દા.ત. Dr. Jay Lakum"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Specialization & Qualification */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">સ્પેશિયલાઇઝેશન</label>
                            <input
                                type="text"
                                value={specialization}
                                onChange={(e) => setSpecialization(e.target.value)}
                                placeholder="દા.ત. General Physician / Pediatrician"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">ડિગ્રી / Qualification</label>
                            <input
                                type="text"
                                value={qualification}
                                onChange={(e) => setQualification(e.target.value)}
                                placeholder="MBBS, MD (Medicine)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Phone & Consultation Fee */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">મોબાઈલ નંબર</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="9898xxxxxx"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">કન્સલ્ટેશન ફી (₹)</label>
                            <input
                                type="number"
                                value={defaultFee}
                                onChange={(e) => setDefaultFee(e.target.value)}
                                placeholder="300"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    {/* City & Address */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">શહેર / ગામ</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="દા.ત. બોટાદ, અમદાવાદ"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">મેડિકલ રજિસ્ટ્રેશન નં.</label>
                            <input
                                type="text"
                                value={registrationNumber}
                                onChange={(e) => setRegistrationNumber(e.target.value)}
                                placeholder="G-12345"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`w-full py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition cursor-pointer ${
                                isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                        >
                            {isSaving ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>પ્રોફાઇલ સેવ થઈ રહી છે...</span>
                                </>
                            ) : (
                                <span>સેવ કરો (Save Profile)</span>
                            )}
                        </button>
                    </div>

                </form>

            </div>
        </div>
    );
}
