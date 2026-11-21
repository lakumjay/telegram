import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    X, 
    Phone, 
    MessageSquare, 
    PhoneCall, 
    Receipt, 
    Camera, 
    Upload, 
    Trash2, 
    Calendar, 
    User, 
    MapPin, 
    Pill, 
    Activity, 
    CheckCircle2, 
    AlertCircle, 
    RefreshCw, 
    ZoomIn, 
    ExternalLink,
    Plus,
    Edit2,
    Save
} from 'lucide-react';

export default function PatientDetailModal({ 
    patientId, 
    isOpen, 
    onClose, 
    onOpenVoiceCall, 
    onOpenNewBill,
    onPatientUpdated
}) {
    if (!isOpen || !patientId) return null;

    const [patient, setPatient] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [deletingVisitId, setDeletingVisitId] = useState(null);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
    const [zoomedPhoto, setZoomedPhoto] = useState(null);

    // Edit Patient State
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editAge, setEditAge] = useState('');
    const [editGender, setEditGender] = useState('Male');
    const [editCity, setEditCity] = useState('');
    const [editDiagnosis, setEditDiagnosis] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    useEffect(() => {
        fetchPatientData();
    }, [patientId]);

    const fetchPatientData = async () => {
        setIsLoading(true);
        setStatusMsg({ type: '', text: '' });
        try {
            const res = await axios.get(`/api/patients/${patientId}`);
            if (res.data?.success) {
                const pt = res.data.patient;
                setPatient(pt);
                setEditName(pt.name || '');
                setEditPhone(pt.phone || '');
                setEditAge(pt.age || '');
                setEditGender(pt.gender || 'Male');
                setEditCity(pt.city || '');
                setEditDiagnosis(pt.last_diagnosis || '');
            }
        } catch (err) {
            console.error('Error fetching patient:', err);
            setStatusMsg({ type: 'error', text: 'દર્દીની વિગતો લોડ ન થઈ શકી.' });
        } finally {
            setIsLoading(false);
        }
    };

    // Save Patient Edit
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        const cleanName = editName.trim();
        if (!cleanName) {
            setStatusMsg({ type: 'error', text: 'દર્દીનું નામ દાખલ કરવું ફરજિયાત છે.' });
            return;
        }

        const cleanPhone = editPhone.trim();
        if (cleanPhone && cleanPhone.length !== 10) {
            setStatusMsg({ type: 'error', text: 'કૃપા કરીને ૧૦ અંકનો સાચો મોબાઈલ નંબર દાખલ કરો.' });
            return;
        }

        setIsSavingEdit(true);
        setStatusMsg({ type: '', text: '' });

        try {
            const res = await axios.post(`/api/patients/${patientId}`, {
                name: cleanName,
                phone: cleanPhone || null,
                age: editAge ? parseInt(editAge) : null,
                gender: editGender,
                city: editCity || null,
                last_diagnosis: editDiagnosis || 'સામાન્ય તપાસ',
            });

            if (res.data?.success) {
                setPatient(res.data.patient);
                setIsEditing(false);
                setStatusMsg({ type: 'success', text: '✅ દર્દીની વિગતો સફળતાપૂર્વક અપડેટ થઈ ગઈ!' });
                if (window.showAppToast) {
                    window.showAppToast('✅ દર્દીની વિગતો સફળતાપૂર્વક અપડેટ થઈ ગઈ!');
                }
                if (window.triggerAppRefresh) {
                    window.triggerAppRefresh();
                }
                if (onPatientUpdated) onPatientUpdated(res.data.patient);
            }
        } catch (err) {
            console.error('Error updating patient:', err);
            setStatusMsg({ type: 'error', text: err.response?.data?.message || 'દર્દી અપડેટ કરવામાં ક્ષતિ આવી.' });
        } finally {
            setIsSavingEdit(false);
        }
    };

    // Delete Entire Patient Record
    const handleDeletePatient = async () => {
        if (!confirm(`શું તમે ખરેખર "${patient?.name}" દર્દીનો તમામ રેકોર્ડ ડિલીટ કરવા માંગો છો?`)) return;

        try {
            const res = await axios.delete(`/api/patients/${patientId}`);
            if (res.data?.success) {
                if (window.showAppToast) {
                    window.showAppToast('🗑️ દર્દીનો રેકોર્ડ ડિલીટ થઈ ગયો.');
                }
                if (window.triggerAppRefresh) {
                    window.triggerAppRefresh();
                }
                if (onPatientUpdated) onPatientUpdated(null);
                onClose();
            }
        } catch (err) {
            console.error('Error deleting patient:', err);
            alert('દર્દી ડિલીટ કરવામાં ક્ષતિ આવી.');
        }
    };

    // Direct Photo Upload (Camera or File)
    const handlePhotoSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingPhoto(true);
        setStatusMsg({ type: '', text: '' });

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const res = await axios.post(`/api/patients/${patientId}/upload-photo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.success) {
                setPatient(res.data.patient);
                setStatusMsg({ type: 'success', text: '✅ નવો પ્રિસ્ક્રિપ્શન ફોટો અપલોડ થઈ ગયો!' });
                if (onPatientUpdated) onPatientUpdated(res.data.patient);
            }
        } catch (err) {
            console.error('Error uploading photo:', err);
            setStatusMsg({ 
                type: 'error', 
                text: err.response?.data?.message || 'ફોટો અપલોડ કરવામાં ક્ષતિ આવી.' 
            });
        } finally {
            setIsUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (cameraInputRef.current) cameraInputRef.current.value = '';
        }
    };

    // Delete Visit / Photo
    const handleDeleteVisit = async (visitId) => {
        if (!confirm('શું તમે આ પ્રિસ્ક્રિપ્શન ફોટો ખરેખર ડિલીટ કરવા માંગો છો?')) return;

        setDeletingVisitId(visitId);
        try {
            const res = await axios.delete(`/api/patients/visits/${visitId}`);
            if (res.data?.success) {
                setPatient(res.data.patient);
                setStatusMsg({ type: 'success', text: '🗑️ ફોટો ડિલીટ થઈ ગયો.' });
                if (onPatientUpdated) onPatientUpdated(res.data.patient);
            }
        } catch (err) {
            console.error('Error deleting photo:', err);
            setStatusMsg({ type: 'error', text: 'ફોટો ડિલીટ કરવામાં ક્ષતિ આવી.' });
        } finally {
            setDeletingVisitId(null);
        }
    };

    const handleShareWhatsApp = () => {
        if (!patient?.phone) return;
        const url = `https://wa.me/91${patient.phone}?text=${encodeURIComponent(`નમસ્તે ${patient.name}, ક્લિનિકમાંથી સંપર્ક કરવામાં આવ્યો છે.`)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 my-6 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
                
                {/* 1. Modal Header with Edit, Delete & Close Button */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-md shadow-emerald-700/20">
                            {patient ? patient.name.charAt(0) : 'P'}
                        </div>
                        <div>
                            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                                {patient?.name || 'દર્દીની વિગતો'}
                            </h2>
                            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                                {patient?.phone ? `📞 ${patient.phone}` : 'મોબાઈલ નંબર નથી'}
                                {patient?.age ? `• ${patient.age} વર્ષ` : ''}
                                {patient?.city ? `• ${patient.city}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-1">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`p-1.5 rounded-xl transition cursor-pointer ${
                                isEditing ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                            }`}
                            title="Edit Patient"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                            onClick={handleDeletePatient}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Patient Record"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Inline Edit Patient Form */}
                {isEditing && (
                    <form onSubmit={handleSaveEdit} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs animate-in fade-in flex-shrink-0">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 font-bold text-slate-700">
                            <span>દર્દીની વિગતો સુધારો (Edit Patient)</span>
                            <button type="button" onClick={() => setIsEditing(false)} className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer">રદ કરો</button>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">દર્દીનું નામ *</label>
                            <input
                                type="text"
                                required
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-0.5">મોબાઈલ નંબર</label>
                                <input
                                    type="tel"
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    placeholder="૧૦ અંક"
                                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-0.5">ઉંમર</label>
                                <input
                                    type="number"
                                    value={editAge}
                                    onChange={(e) => setEditAge(e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-0.5">તકલીફ (Diagnosis)</label>
                            <input
                                type="text"
                                value={editDiagnosis}
                                onChange={(e) => setEditDiagnosis(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        <div className="flex justify-end space-x-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                                રદ કરો
                            </button>
                            <button
                                type="submit"
                                disabled={isSavingEdit}
                                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center space-x-1 shadow-xs cursor-pointer"
                            >
                                {isSavingEdit ? 'સેવ થાય છે...' : 'ફેરફાર સેવ કરો'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Status Toast Message */}
                {statusMsg.text && (
                    <div className={`p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 flex-shrink-0 ${
                        statusMsg.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                        {statusMsg.type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
                        <span>{statusMsg.text}</span>
                    </div>
                )}

                {/* Scrollable Content Body */}
                <div className="overflow-y-auto space-y-4 flex-1 pr-1">
                    
                    {isLoading ? (
                        <div className="py-12 text-center space-y-2">
                            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                            <p className="text-xs text-slate-400 font-bold">વિગતો લોડ થઈ રહી છે...</p>
                        </div>
                    ) : (
                        <>
                            {/* 2. Quick Action Bar for Patient */}
                            <div className="grid grid-cols-4 gap-2">
                                <a
                                    href={`tel:${patient?.phone}`}
                                    className="p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex flex-col items-center justify-center space-y-1 transition text-center"
                                >
                                    <Phone className="w-4 h-4" />
                                    <span className="text-[10px]">કૉલ કરો</span>
                                </a>

                                <button
                                    onClick={handleShareWhatsApp}
                                    className="p-2.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs flex flex-col items-center justify-center space-y-1 transition text-center cursor-pointer"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span className="text-[10px]">WhatsApp</span>
                                </button>

                                <button
                                    onClick={() => {
                                        onClose();
                                        if (onOpenVoiceCall) onOpenVoiceCall(patient);
                                    }}
                                    className="p-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex flex-col items-center justify-center space-y-1 transition text-center cursor-pointer"
                                >
                                    <PhoneCall className="w-4 h-4" />
                                    <span className="text-[10px]">AI Call</span>
                                </button>

                                <button
                                    onClick={() => {
                                        onClose();
                                        if (onOpenNewBill) onOpenNewBill(patient);
                                    }}
                                    className="p-2.5 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex flex-col items-center justify-center space-y-1 transition text-center cursor-pointer"
                                >
                                    <Receipt className="w-4 h-4" />
                                    <span className="text-[10px]">New Bill</span>
                                </button>
                            </div>

                            {/* 3. Clinical Summary Card */}
                            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-slate-700">છેલ્લી તપાસ & તકલીફ (Diagnosis):</span>
                                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                        {patient?.last_diagnosis || 'સામાન્ય તપાસ'}
                                    </span>
                                </div>
                                {patient?.last_medicines && (
                                    <div className="pt-1.5 border-t border-slate-200/60">
                                        <p className="font-bold text-slate-500 text-[11px]">આપેલી દવાઓ:</p>
                                        <p className="font-semibold text-slate-800 mt-0.5">{patient.last_medicines}</p>
                                    </div>
                                )}
                            </div>

                            {/* 4. Upload New Photo / Prescription Section */}
                            <div className="bg-emerald-50/60 rounded-3xl p-3.5 sm:p-4 border border-emerald-200/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">
                                            નવો પ્રિસ્ક્રિપ્શન / રિપોર્ટ ફોટો ઉમેરો
                                        </h3>
                                        <p className="text-[10px] text-slate-500">
                                            ફોટો પાડો અથવા ગેલેરીમાંથી અપલોડ કરો
                                        </p>
                                    </div>
                                    {isUploadingPhoto && (
                                        <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-bold">
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>અપલોડ થાય છે...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Hidden Inputs */}
                                <input
                                    type="file"
                                    ref={cameraInputRef}
                                    onChange={handlePhotoSelect}
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                />
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handlePhotoSelect}
                                    accept="image/*,.pdf"
                                    className="hidden"
                                />

                                {/* Buttons: Camera & Upload */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        disabled={isUploadingPhoto}
                                        onClick={() => cameraInputRef.current?.click()}
                                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                                    >
                                        <Camera className="w-4 h-4" />
                                        <span>ફોટો પાડો (Camera)</span>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isUploadingPhoto}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="py-2.5 px-3 rounded-xl bg-white hover:bg-emerald-50 border-2 border-emerald-600 text-emerald-700 font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                                    >
                                        <Upload className="w-4 h-4" />
                                        <span>ગેલેરીમાંથી અપલોડ</span>
                                    </button>
                                </div>
                            </div>

                            {/* 5. Photos Timeline & Gallery (with Delete and Zoom!) */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <span>પ્રિસ્ક્રિપ્શન ફોટા અને હિસ્ટ્રી</span>
                                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                                            {patient?.visits?.length || 0}
                                        </span>
                                    </h3>
                                </div>

                                {(!patient?.visits || patient.visits.length === 0) ? (
                                    <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 space-y-1">
                                        <Camera className="w-6 h-6 mx-auto text-slate-300" />
                                        <p className="text-xs font-bold">હજુ સુધી કોઈ ફોટો અપલોડ થયો નથી.</p>
                                        <p className="text-[10px]">ઉપર આપેલા બટનથી ફોટો પાડો અથવા અપલોડ કરો.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {patient.visits.map((visit) => (
                                            <div
                                                key={visit.id}
                                                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 space-y-2.5 hover:border-emerald-200 transition"
                                            >
                                                {/* Visit Header */}
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center space-x-2">
                                                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                                                        <span className="font-bold text-slate-800">
                                                            {visit.visit_date ? new Date(visit.visit_date).toLocaleDateString('gu-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'તારીખ નથી'}
                                                        </span>
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                                                            {visit.diagnosis || 'સામાન્ય તપાસ'}
                                                        </span>
                                                    </div>

                                                    {/* Delete Photo Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteVisit(visit.id)}
                                                        disabled={deletingVisitId === visit.id}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                                        title="આ ફોટો ડિલીટ કરો"
                                                    >
                                                        {deletingVisitId === visit.id ? (
                                                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                                        ) : (
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Prescription Image Preview */}
                                                {visit.photo_path && (
                                                    <div className="relative rounded-xl overflow-hidden border border-slate-100 bg-slate-100 group max-h-56 flex items-center justify-center">
                                                        <img
                                                            src={visit.photo_path}
                                                            alt="Prescription"
                                                            className="w-full h-auto max-h-56 object-contain"
                                                        />
                                                        <button
                                                            onClick={() => setZoomedPhoto(visit.photo_path)}
                                                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold flex items-center space-x-1 shadow-md transition cursor-pointer"
                                                        >
                                                            <ZoomIn className="w-3.5 h-3.5" />
                                                            <span>મોટું જુઓ</span>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Medicines for this visit */}
                                                {visit.medicines && (
                                                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                                                        <span className="font-bold text-slate-900">દવાઓ: </span>
                                                        <span>{visit.medicines}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                </div>

            </div>

            {/* 6. Fullscreen Zoom Photo Lightbox */}
            {zoomedPhoto && (
                <div 
                    onClick={() => setZoomedPhoto(null)}
                    className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
                >
                    <button
                        onClick={() => setZoomedPhoto(null)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img
                        src={zoomedPhoto}
                        alt="Zoomed Prescription"
                        className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

        </div>
    );
}
