import React, { useState, useEffect } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, Sparkles, Building2, ImageIcon, X } from 'lucide-react';
import axios from 'axios';

export default function DocumentUploadModal({ isOpen, onClose, onUploaded }) {
    if (!isOpen) return null;

    const [files, setFiles] = useState([]);
    const [title, setTitle] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [companies, setCompanies] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Reset when modal closes or opens
    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen]);

    // Handle file selection (supports multiple files: PDF, JPG, PNG, WEBP, DOC, etc.)
    const handleFileChange = (e) => {
        const selectedList = Array.from(e.target.files || []);
        if (selectedList.length > 0) {
            setFiles(prev => [...prev, ...selectedList]);
            if (!title && selectedList.length === 1) {
                const nameWithoutExt = selectedList[0].name.replace(/\.[^/.]+$/, "");
                setTitle(nameWithoutExt);
            }
        }
    };

    const removeFileAt = (index) => {
        setFiles(prev => prev.filter((_, idx) => idx !== index));
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
        if (files.length === 0) {
            setError('Please select at least one file to upload.');
            return;
        }

        setError(null);
        setIsUploading(true);

        const formData = new FormData();
        files.forEach((f) => {
            formData.append('files[]', f);
        });
        if (title) formData.append('title', title);
        formData.append('doc_type', 'auto');
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
                setSuccessMessage(res.data.message || `${files.length} file(s) uploaded successfully.`);
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
        setFiles([]);
        setTitle('');
        setSuccessMessage(null);
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
                            <h3 className="text-sm font-bold text-slate-900">Upload Files</h3>
                            <p className="text-[11px] text-slate-500">Multiple file selection supported (PDF, Photos, All Formats)</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
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

                {successMessage ? (
                    /* Success State */
                    <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-900">{successMessage}</h4>
                        <div className="flex justify-center space-x-2 pt-2">
                            <button
                                onClick={resetForm}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                            >
                                + Upload More Files
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
                        
                        {/* Multiple File Selection Area */}
                        <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition bg-slate-50 relative group">
                            <input
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                accept="*/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <UploadCloud className="w-8 h-8 text-emerald-600 mx-auto mb-1 transition group-hover:scale-110" />
                            <p className="text-sm font-bold text-slate-800">Click to Select Files (Multiple Allowed)</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">PDF, Photos, JPG, PNG, WEBP & All Formats</p>
                        </div>

                        {/* Selected Files List */}
                        {files.length > 0 && (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                <div className="text-[11px] font-bold text-slate-600 flex justify-between">
                                    <span>Selected Files ({files.length}):</span>
                                    <button 
                                        type="button" 
                                        onClick={() => setFiles([])} 
                                        className="text-rose-600 hover:underline cursor-pointer"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                {files.map((f, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                                        <div className="flex items-center space-x-2 truncate">
                                            <File className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                            <span className="truncate font-medium text-slate-800">{f.name}</span>
                                            <span className="text-[10px] text-slate-400">({(f.size / 1024).toFixed(0)} KB)</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFileAt(idx)}
                                            className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer ml-2"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Title (Optional for batch or custom for single) */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Title / Label
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
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
                            <span>AI automatically detects content and indexes OCR text.</span>
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
                                disabled={files.length === 0 || isUploading}
                                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                            >
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>{isUploading ? `Uploading... (${uploadProgress}%)` : `Upload & Save (${files.length})`}</span>
                            </button>
                        </div>
                    </form>
                )}

            </div>
        </div>
    );
}
