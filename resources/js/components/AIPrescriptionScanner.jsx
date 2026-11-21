import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
    ArrowLeft, 
    Camera, 
    Upload, 
    Check, 
    Sparkles, 
    RefreshCw, 
    X, 
    CheckCircle2, 
    AlertCircle, 
    User, 
    Phone, 
    Pill, 
    FileText, 
    Activity,
    HeartPulse
} from 'lucide-react';

export default function AIPrescriptionScanner({ 
    activeClinicId = 1,
    onBack, 
    onPatientSaved 
}) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
    
    // Verification & Edit Modal State
    const [extractedData, setExtractedData] = useState(null);
    const [isVerifyOpen, setIsVerifyOpen] = useState(false);
    const [isSavingPatient, setIsSavingPatient] = useState(false);

    // Form inputs for verification
    const [patientName, setPatientName] = useState('');
    const [phone, setPhone] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('Male');
    const [city, setCity] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [medicines, setMedicines] = useState('');
    const [symptoms, setSymptoms] = useState('');

    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setStatusMessage({ type: '', text: '' });

        const reader = new FileReader();
        reader.onload = (event) => {
            setPreviewUrl(event.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setStatusMessage({ type: '', text: '' });
    };

    // Scan Prescription with Gemini AI
    const handleScanPrescription = async () => {
        if (!selectedFile) {
            setStatusMessage({ type: 'error', text: 'કૃપા કરીને પ્રિસ્ક્રિપ્શનનો ફોટો પસંદ કરો.' });
            return;
        }

        setIsScanning(true);
        setStatusMessage({ type: '', text: '' });

        const formData = new FormData();
        formData.append('photo', selectedFile);
        formData.append('clinic_id', activeClinicId);

        try {
            const res = await axios.post('/api/patients/upload-prescription', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.success) {
                const data = res.data;
                const ext = data.extracted || {};
                const pt = data.patient || {};

                setPatientName(pt.name || ext.patient_name || 'નવો દર્દી');
                setPhone(pt.phone || ext.phone || '');
                setAge(pt.age || ext.age || '');
                setGender(pt.gender || ext.gender || 'Male');
                setCity(pt.city || ext.city || '');
                setDiagnosis(data.visit?.diagnosis || ext.diagnosis || 'સામાન્ય તપાસ');
                setMedicines(data.visit?.medicines || ext.medicines || '');
                setSymptoms(data.visit?.symptoms || ext.symptoms || '');

                setExtractedData(data);
                setIsVerifyOpen(true);
            } else {
                setStatusMessage({ type: 'error', text: res.data?.message || 'AI સ્કેન કરવામાં ક્ષતિ આવી.' });
            }
        } catch (err) {
            console.error('Scan error:', err);
            setStatusMessage({ 
                type: 'error', 
                text: err.response?.data?.message || 'પ્રિસ્ક્રિપ્શન સ્કેન કરવામાં ક્ષતિ આવી. ફરી પ્રયાસ કરો.' 
            });
        } finally {
            setIsScanning(false);
        }
    };

    // Confirm & Save Verified Data
    const handleConfirmSave = async () => {
        setIsSavingPatient(true);
        try {
            if (extractedData?.patient?.id) {
                await axios.put(`/api/patients/${extractedData.patient.id}`, {
                    name: patientName,
                    phone: phone,
                    age: age,
                    gender: gender,
                    city: city,
                    last_diagnosis: diagnosis,
                    last_medicines: medicines,
                    clinic_id: activeClinicId
                });
            }

            setIsVerifyOpen(false);
            if (onPatientSaved) onPatientSaved();
            if (onBack) onBack();
        } catch (err) {
            console.error('Save error:', err);
        } finally {
            setIsSavingPatient(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-4 pb-20">
            
            {/* Header matching Screen 3 */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={onBack}
                        className="w-9 h-9 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h2 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                            AI Prescription Reader
                        </h2>
                        <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" /> Powered by Gemini AI
                        </p>
                    </div>
                </div>

                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                    Auto-Extract
                </span>
            </div>

            {/* Error Message */}
            {statusMessage.text && (
                <div className={`p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 ${
                    statusMessage.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{statusMessage.text}</span>
                </div>
            )}

            {/* Upload or Take Photo Box matching Screen 3 */}
            <div className="bg-white rounded-3xl p-5 border-2 border-dashed border-emerald-300/80 shadow-xs text-center space-y-4">
                
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                    <Camera className="w-7 h-7" />
                </div>

                <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                        Upload Prescription or Take Photo
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        JPG, PNG upto 10MB
                    </p>
                </div>

                {/* 2 Buttons Side-by-Side: Camera & Upload */}
                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto pt-1">
                    <input 
                        type="file" 
                        ref={cameraInputRef} 
                        onChange={handleFileSelect} 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                    />
                    <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-xs transition active:scale-95 cursor-pointer"
                    >
                        <Camera className="w-4 h-4" />
                        <span>Camera</span>
                    </button>

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                        accept="image/*,.pdf" 
                        className="hidden" 
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-2.5 px-4 rounded-xl bg-white hover:bg-emerald-50 border-2 border-emerald-600 text-emerald-700 font-extrabold text-xs flex items-center justify-center space-x-2 shadow-2xs transition active:scale-95 cursor-pointer"
                    >
                        <Upload className="w-4 h-4" />
                        <span>Upload</span>
                    </button>
                </div>

            </div>

            {/* Image Preview Box matching Screen 3 */}
            {previewUrl && (
                <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs relative space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Selected Image Preview
                        </span>
                        <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Remove Photo"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 max-h-72 flex items-center justify-center">
                        <img 
                            src={previewUrl} 
                            alt="Prescription preview" 
                            className="w-full h-auto max-h-72 object-contain" 
                        />
                        {/* Green checkmark badge in corner matching Screen 3 */}
                        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                            <Check className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            )}

            {/* Big Action Button matching Screen 3 */}
            <button
                type="button"
                onClick={handleScanPrescription}
                disabled={!selectedFile || isScanning}
                className={`w-full py-3.5 px-6 rounded-2xl font-extrabold text-sm flex items-center justify-center space-x-2 shadow-md transition active:scale-98 cursor-pointer ${
                    !selectedFile || isScanning
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20'
                }`}
            >
                {isScanning ? (
                    <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Gemini AI વાંચી રહ્યું છે...</span>
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4 text-emerald-200" />
                        <span>Scan Prescription</span>
                    </>
                )}
            </button>

            {/* Verification & Edit Modal before saving */}
            {isVerifyOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 my-8">
                        
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-sm text-slate-900">
                                        Verify AI Extracted Details
                                    </h3>
                                    <p className="text-[10px] text-slate-400">ડૉક્ટર દ્વારા ખાતરી કરો અને સુધારો</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsVerifyOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    દર્દીનું નામ (Patient Name)
                                </label>
                                <input
                                    type="text"
                                    value={patientName}
                                    onChange={(e) => setPatientName(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                        મોબાઈલ નંબર (Phone)
                                    </label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="મોબાઈલ નંબર"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                        ઉંમર (Age)
                                    </label>
                                    <input
                                        type="number"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                        placeholder="ઉંમર"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    તકલીફ / બીમારી (Diagnosis & Symptoms)
                                </label>
                                <input
                                    type="text"
                                    value={diagnosis}
                                    onChange={(e) => setDiagnosis(e.target.value)}
                                    placeholder="તકલીફ / નિદાન"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                    દવાઓ અને ડોઝ (Medicines)
                                </label>
                                <textarea
                                    value={medicines}
                                    onChange={(e) => setMedicines(e.target.value)}
                                    rows={3}
                                    placeholder="દવાઓ અને ડોઝની વિગત"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsVerifyOpen(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition"
                            >
                                રદ કરો
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSave}
                                disabled={isSavingPatient}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center justify-center space-x-1.5"
                            >
                                {isSavingPatient ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Confirm & Save</span>
                                    </>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
