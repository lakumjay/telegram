import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, Sparkles, Building2, Camera, RefreshCw, Scissors } from 'lucide-react';
import axios from 'axios';

export default function DocumentUploadModal({ isOpen, onClose, onUploaded }) {
    if (!isOpen) return null;

    const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'camera'
    const [file, setFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [title, setTitle] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [companies, setCompanies] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const [successDoc, setSuccessDoc] = useState(null);
    
    // Live Camera Scanner States
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Fetch companies
    useEffect(() => {
        axios.get('/api/companies').then(res => {
            const list = res.data.companies || [];
            setCompanies(list);
            if (list.length > 0 && !companyId) {
                setCompanyId(list[0].id);
            }
        }).catch(err => console.error(err));
    }, []);

    const startCamera = async () => {
        setError(null);
        setUploadMode('camera');
        setIsCameraActive(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch(err) {
            console.error('Camera open error:', err);
            setError('કેમેરા ઓપન કરવામાં ભૂલ આવી. પરમિશન Allow કરો.');
            setIsCameraActive(false);
            setUploadMode('file');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const captureDocument = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const capturedFile = new File([blob], `Scanned_Doc_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setFile(capturedFile);
            setFilePreview(canvas.toDataURL('image/jpeg'));
            if (!title) setTitle(`Scanned Document ${new Date().toLocaleDateString()}`);
            stopCamera();
            setUploadMode('file');
        }, 'image/jpeg', 0.92);
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('કૃપા કરીને ફાઇલ (PDF અથવા ફોટો) પસંદ કરો');
            return;
        }

        setError(null);
        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('doc_type', 'auto'); // Server auto-detects from OCR
        if (companyId) formData.append('company_id', companyId);

        try {
            const res = await axios.post('/api/documents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percent);
                }
            });

            if (res.data.success) {
                setSuccessDoc(res.data.document);
                if (onUploaded) onUploaded();
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.message || 'અપલોડ કરવામાં ભૂલ આવી.');
        } finally {
            setIsUploading(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setTitle('');
        setSuccessDoc(null);
        setError(null);
        setUploadProgress(0);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                            <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">નવો દસ્તાવેજ અપલોડ કરો</h3>
                            <p className="text-[11px] text-slate-400">PDF કે ઈમેજ અપલોડ કરો (Auto Deep OCR સાથે)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                {error && (
                    <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {successDoc ? (
                    /* Success State */
                    <div className="p-6 bg-slate-950 rounded-2xl border border-emerald-500/30 text-center space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                        <h4 className="text-sm font-bold text-white">દસ્તાવેજ સફળતાપૂર્વક અપલોડ & OCR ઇન્ડેક્સ થયો!</h4>
                        <div className="p-3 bg-slate-900 rounded-xl text-xs text-slate-300 text-left space-y-1">
                            <p><span className="text-slate-500">નામ:</span> {successDoc.title}</p>
                            <p><span className="text-slate-500">પ્રકાર:</span> {successDoc.doc_type?.toUpperCase()}</p>
                            {successDoc.stamp_value && <p><span className="text-slate-500">સ્ટેમ્પ વેલ્યુ:</span> ₹{successDoc.stamp_value}</p>}
                        </div>
                        <div className="flex justify-center space-x-2 pt-2">
                            <button
                                onClick={resetForm}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                                + બીજો દસ્તાવેજ અપલોડ કરો
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-medium rounded-xl hover:bg-slate-700 transition cursor-pointer"
                            >
                                પૂર્ણ થયું
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Upload Form */
                    <form onSubmit={handleUpload} className="space-y-4">
                        
                        {/* Selector Tabs: File Upload vs Camera Scanner */}
                        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                            <button
                                type="button"
                                onClick={() => {
                                    stopCamera();
                                    setUploadMode('file');
                                }}
                                className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                                    uploadMode === 'file' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <UploadCloud className="w-4 h-4" />
                                <span>ફાઇલ / ફોટો પસંદ કરો</span>
                            </button>

                            <button
                                type="button"
                                onClick={startCamera}
                                className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                                    uploadMode === 'camera' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Camera className="w-4 h-4 text-emerald-300 animate-pulse" />
                                <span>📷 CamScanner (કેમેરાથી સ્કેન)</span>
                            </button>
                        </div>

                        {/* Live Camera Scanner View */}
                        {uploadMode === 'camera' && (
                            <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/50 aspect-video flex flex-col items-center justify-center shadow-2xl">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                {/* Scanner Frame Overlay */}
                                <div className="absolute inset-4 border-2 border-dashed border-emerald-400/70 rounded-xl pointer-events-none flex items-center justify-center">
                                    <span className="text-[10px] text-emerald-300 font-bold bg-black/60 px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                                        દસ્તાવેજને ફ્રેમમાં રાખો
                                    </span>
                                </div>
                                {/* Capture Button */}
                                <div className="absolute bottom-3 flex items-center space-x-3 z-10">
                                    <button
                                        type="button"
                                        onClick={captureDocument}
                                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-full shadow-lg shadow-emerald-500/50 transition active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                                    >
                                        <Camera className="w-4 h-4" />
                                        <span>ફોટો સ્કેન કરો (Auto Crop)</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Drag & Drop Area */}
                        {uploadMode === 'file' && (
                        <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/80 rounded-2xl p-5 text-center cursor-pointer transition bg-slate-950/40 relative">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {file ? (
                                <div className="space-y-2">
                                    {filePreview ? (
                                        <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover mx-auto rounded-xl border border-slate-700 shadow-md" />
                                    ) : (
                                        <File className="w-10 h-10 text-blue-400 mx-auto" />
                                    )}
                                    <p className="text-xs font-bold text-white">{file.name}</p>
                                    <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB • ક્લિક કરીને બદલી શકો છો</p>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <UploadCloud className="w-10 h-10 text-slate-400 mx-auto" />
                                    <p className="text-xs font-medium text-slate-200">ફાઇલ અથવા ફોટો પસંદ કરો</p>
                                    <p className="text-[11px] text-slate-400">PDF, JPG, PNG ફોટો (મહત્તમ 50 MB)</p>
                                </div>
                            )}
                        </div>
                        )}

                        {/* Document Title */}
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">
                                દસ્તાવેજનું નામ (Title)
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="દા.ત. Rajeshwari Solar GST, Sunrise Lease Deed, ₹300 Stamp"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* 3 Companies Section Selection */}
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                                <span>કંપની પસંદ કરો (Company Selection)</span>
                                <span className="text-[10px] text-emerald-400">AI Auto-Categorized</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {companies.map(c => {
                                    const isSelected = String(companyId) === String(c.id);
                                    return (
                                        <button
                                            type="button"
                                            key={c.id}
                                            onClick={() => setCompanyId(c.id)}
                                            className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                                isSelected 
                                                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/10' 
                                                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full mb-1">
                                                <Building2 className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                                                {isSelected && <span className="w-2 h-2 rounded-full bg-blue-400"></span>}
                                            </div>
                                            <span className="text-xs font-bold leading-tight">{c.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* OCR Info Note */}
                        <div className="p-3 bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-900/50 rounded-xl flex items-center space-x-2 text-[11px] text-blue-200">
                            <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-400" />
                            <span>✨ <strong>Doc Type પસંદ કરવાની જરૂર નથી:</strong> AI આપમેળે ઓળખી લેશે (GST, PAN, લીઝ ડીડ કે અન્ય).</span>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end space-x-2 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-700 transition"
                            >
                                કેન્સલ
                            </button>
                            <button
                                type="submit"
                                disabled={!file || isUploading}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center space-x-1.5 cursor-pointer"
                            >
                                <UploadCloud className="w-4 h-4" />
                                <span>{isUploading ? `અપલોડ થાય છે... (${uploadProgress}%)` : 'અપલોડ & OCR Index'}</span>
                            </button>
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
}
