import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, Sparkles, Building2, Camera, RefreshCw, Scissors } from 'lucide-react';
import axios from 'axios';

export default function DocumentUploadModal({ isOpen, onClose, onUploaded, initialMode = 'file' }) {
    if (!isOpen) return null;

    const [uploadMode, setUploadMode] = useState(initialMode); // 'file' or 'camera'
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

    // Auto-trigger camera if initialMode is camera
    useEffect(() => {
        if (isOpen) {
            if (initialMode === 'camera') {
                startCamera();
            } else {
                setUploadMode('file');
            }
        } else {
            stopCamera();
        }
    }, [isOpen, initialMode]);

    // Handle file selection
    const handleFileChange = (e) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            if (!title) {
                const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, "");
                setTitle(nameWithoutExt);
            }
            if (selected.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (re) => setFilePreview(re.target.result);
                reader.readAsDataURL(selected);
            } else {
                setFilePreview(null);
            }
        }
    };

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
            // Priority to real environment/back camera on mobile devices
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch(err) {
            console.error('Camera open error:', err);
            // Fallback for browsers with strict environment constraints
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                streamRef.current = fallbackStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = fallbackStream;
                }
            } catch(e2) {
                setError('Failed to open camera. Please allow camera permissions.');
                setIsCameraActive(false);
                setUploadMode('file');
            }
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
            if (!title) setTitle(`Scanned Document ${new Date().toLocaleDateString('en-GB')}`);
            stopCamera();
            setUploadMode('file');
        }, 'image/jpeg', 0.95);
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file (PDF or Image)');
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
            setError(err.response?.data?.message || 'Upload failed.');
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                            <UploadCloud className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">
                                {uploadMode === 'camera' ? 'CamScanner Camera' : 'Upload Document'}
                            </h3>
                            <p className="text-[11px] text-slate-500">Upload PDF or image with auto OCR indexing</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">✕</button>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                        <span>{error}</span>
                    </div>
                )}

                {successDoc ? (
                    /* Success State */
                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-900">Document Uploaded & Indexed Successfully</h4>
                        <div className="p-3 bg-white rounded-xl text-xs text-slate-700 text-left space-y-1 border border-emerald-100 shadow-xs">
                            <p><span className="text-slate-400">Title:</span> <strong className="text-slate-900">{successDoc.title}</strong></p>
                            <p><span className="text-slate-400">Type:</span> <span className="font-bold text-emerald-700">{successDoc.doc_type?.toUpperCase()}</span></p>
                            {successDoc.stamp_value && <p><span className="text-slate-400">Stamp Value:</span> <strong className="text-amber-600">₹{successDoc.stamp_value}</strong></p>}
                        </div>
                        <div className="flex justify-center space-x-2 pt-2">
                            <button
                                onClick={resetForm}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                            >
                                + Upload Another
                            </button>
                            <button
                                onClick={onClose}
                                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Upload Form */
                    <form onSubmit={handleUpload} className="space-y-4">
                        
                        {/* Selector Tabs: File Upload vs Camera Scanner */}
                        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => {
                                    stopCamera();
                                    setUploadMode('file');
                                }}
                                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                                    uploadMode === 'file' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200 font-bold' : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>File / PDF</span>
                            </button>

                            <button
                                type="button"
                                onClick={startCamera}
                                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                                    uploadMode === 'camera' ? 'bg-emerald-700 text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <Camera className="w-3.5 h-3.5" />
                                <span>CamScanner (Camera)</span>
                            </button>
                        </div>

                        {/* Live Camera Scanner View */}
                        {uploadMode === 'camera' && (
                            <div className="relative rounded-xl overflow-hidden bg-black border-2 border-emerald-500 aspect-video flex flex-col items-center justify-center shadow-lg">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-4 border-2 border-dashed border-emerald-400 rounded-xl pointer-events-none flex items-center justify-center">
                                    <span className="text-[10px] text-emerald-300 font-bold bg-black/60 px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                                        Align document in frame
                                    </span>
                                </div>
                                <div className="absolute bottom-3 flex items-center space-x-3 z-10">
                                    <button
                                        type="button"
                                        onClick={captureDocument}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full shadow-lg transition active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                                    >
                                        <Camera className="w-4 h-4" />
                                        <span>Capture Photo</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Drag & Drop Area / Scanned Preview */}
                        {uploadMode === 'file' && (
                        <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition bg-slate-50 relative">
                            {file ? (
                                <div className="space-y-2">
                                    {filePreview ? (
                                        <div className="relative inline-block">
                                            <img src={filePreview} alt="Preview" className="max-h-40 object-contain mx-auto rounded-lg border border-slate-200 shadow-sm" />
                                        </div>
                                    ) : (
                                        <File className="w-10 h-10 text-emerald-700 mx-auto" />
                                    )}
                                    <p className="text-xs font-bold text-slate-900">{file.name}</p>
                                    <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>

                                    {/* Retake / Discard Actions */}
                                    <div className="flex items-center justify-center space-x-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startCamera();
                                            }}
                                            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold rounded-lg transition shadow-xs flex items-center space-x-1 cursor-pointer"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            <span>Retake / Scan Again</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                                setFilePreview(null);
                                                setTitle('');
                                            }}
                                            className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold rounded-lg transition flex items-center space-x-1 cursor-pointer"
                                        >
                                            <span>Delete / Remove</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                                    <p className="text-xs font-bold text-slate-700">Choose File or PDF</p>
                                    <p className="text-[11px] text-slate-400">PDF, JPG, PNG (Max 50 MB)</p>
                                </div>
                            )}
                        </div>
                        )}

                        {/* Document Title */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Document Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Rajeshwari Solar GST, Sunrise Lease Deed, ₹300 Stamp"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        {/* Company Selection */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                <span>Company</span>
                                <span className="text-[10px] text-emerald-700 font-semibold">Auto-Categorized</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {companies.map(c => {
                                    const isSelected = String(companyId) === String(c.id);
                                    return (
                                        <button
                                            type="button"
                                            key={c.id}
                                            onClick={() => setCompanyId(c.id)}
                                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                                                isSelected 
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs' 
                                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full mb-1">
                                                <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
                                            </div>
                                            <span className="text-xs font-semibold leading-tight">{c.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* OCR Info Note */}
                        <div className="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center space-x-2 text-[11px] text-emerald-900">
                            <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
                            <span>AI automatically detects document type (GST, PAN, Lease Deed, Stamp).</span>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end space-x-2 pt-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!file || isUploading}
                                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                            >
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>{isUploading ? `Uploading... (${uploadProgress}%)` : 'Upload & Index'}</span>
                            </button>
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
}
