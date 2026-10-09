import React, { useState, useEffect } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, Sparkles, Building2, ImageIcon } from 'lucide-react';
import axios from 'axios';

export default function DocumentUploadModal({ isOpen, onClose, onUploaded }) {
    if (!isOpen) return null;

    const [file, setFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [title, setTitle] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [companies, setCompanies] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const [successDoc, setSuccessDoc] = useState(null);

    // Reset when modal closes or opens
    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen]);

    // Handle file selection (supports all file types: PDF, JPG, PNG, WEBP, DOC, etc.)
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

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file to upload (PDF, JPG, PNG, etc.)');
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
        setFilePreview(null);
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
                            <h3 className="text-sm font-bold text-slate-900">Upload File</h3>
                            <p className="text-[11px] text-slate-500">Upload any document, PDF or image file (All formats supported)</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                    >
                        ✕
                    </button>
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
                        <h4 className="text-sm font-bold text-slate-900">File Uploaded & Indexed Successfully</h4>
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
                                + Upload Another File
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
                        
                        {/* Drag & Drop Area / File Preview */}
                        <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 text-center cursor-pointer transition bg-slate-50 relative group">
                            {file ? (
                                <div className="space-y-2">
                                    {filePreview ? (
                                        <div className="relative inline-block">
                                            <img src={filePreview} alt="Preview" className="max-h-44 object-contain mx-auto rounded-lg border border-slate-200 shadow-sm" />
                                        </div>
                                    ) : (
                                        <File className="w-12 h-12 text-emerald-700 mx-auto" />
                                    )}
                                    <p className="text-xs font-bold text-slate-900">{file.name}</p>
                                    <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB • {file.type || 'Document'}</p>

                                    {/* Change / Discard Action */}
                                    <div className="flex items-center justify-center space-x-2 pt-1">
                                        <label className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-lg transition cursor-pointer">
                                            <span>Change File</span>
                                            <input
                                                type="file"
                                                onChange={handleFileChange}
                                                accept="*/*"
                                                className="hidden"
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                                setFilePreview(null);
                                                setTitle('');
                                            }}
                                            className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold rounded-lg transition cursor-pointer"
                                        >
                                            <span>Remove</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <label className="block cursor-pointer py-4">
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept="*/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <UploadCloud className="w-10 h-10 text-emerald-600 mx-auto mb-2 transition group-hover:scale-110" />
                                    <p className="text-sm font-bold text-slate-800">Click to Select File or Drag & Drop</p>
                                    <p className="text-xs text-slate-500 mt-1">PDF, Photos, JPG, PNG, WEBP & All Document Formats</p>
                                    <div className="inline-flex items-center space-x-1.5 mt-2.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] text-slate-600 font-medium shadow-2xs">
                                        <ImageIcon className="w-3 h-3 text-emerald-600" />
                                        <span>Max file size: 50 MB</span>
                                    </div>
                                </label>
                            )}
                        </div>

                        {/* Document Title */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                File / Document Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter document title"
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
                            <span>AI automatically detects and indexes content (GST, PAN, Lease Deed, Stamp, etc.).</span>
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
                                <span>{isUploading ? `Uploading... (${uploadProgress}%)` : 'Upload & Save'}</span>
                            </button>
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
}
