import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Filter, 
    Folder, 
    FileText, 
    Download, 
    Archive, 
    Sparkles, 
    CheckSquare, 
    Square, 
    Building2, 
    HelpCircle, 
    ChevronRight,
    Tag,
    Trash2,
    Eye,
    CheckCircle2
} from 'lucide-react';
import axios from 'axios';

export default function DocumentExplorer({ onOpenUpload, onOpenCall }) {
    const [documents, setDocuments] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedFolderId, setSelectedFolderId] = useState('');
    const [selectedDocType, setSelectedDocType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [disambiguation, setDisambiguation] = useState(null);
    const [selectedDocIds, setSelectedDocIds] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [isCreatingZip, setIsCreatingZip] = useState(false);
    const [zipSuccessData, setZipSuccessData] = useState(null);

    // Fetch companies & folders on mount
    useEffect(() => {
        fetchCompanies();
        fetchDocuments();
    }, []);

    // Re-fetch documents when filters change
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchDocuments();
        }, 250);
        return () => clearTimeout(timeout);
    }, [selectedCompanyId, selectedFolderId, selectedDocType, searchQuery]);

    const fetchCompanies = async () => {
        try {
            const res = await axios.get('/api/companies');
            setCompanies(res.data.companies || []);
        } catch (err) {
            console.error('Error fetching companies:', err);
        }
    };

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/documents', {
                params: {
                    company_id: selectedCompanyId || undefined,
                    folder_id: selectedFolderId || undefined,
                    doc_type: selectedDocType || undefined,
                    search: searchQuery || undefined,
                }
            });

            setDocuments(res.data.data || []);
            setSuggestions(res.data.suggestions || []);

            if (res.data.disambiguation_required) {
                setDisambiguation(res.data.disambiguation_data);
            } else {
                setDisambiguation(null);
            }
        } catch (err) {
            console.error('Error fetching documents:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle single document selection
    const toggleSelectDoc = (id) => {
        setSelectedDocIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Select all / Deselect all
    const toggleSelectAll = () => {
        if (selectedDocIds.length === documents.length) {
            setSelectedDocIds([]);
        } else {
            setSelectedDocIds(documents.map(d => d.id));
        }
    };

    // Create ZIP from selected documents
    const handleCreateZip = async (mode = 'single_master_zip') => {
        if (selectedDocIds.length === 0) return;
        setIsCreatingZip(true);
        try {
            const res = await axios.post('/api/zip/create', {
                document_ids: selectedDocIds,
                mode: mode,
            });

            if (res.data.success) {
                setZipSuccessData(res.data);
            }
        } catch (err) {
            console.error('Error creating ZIP:', err);
        } finally {
            setIsCreatingZip(false);
        }
    };

    // Delete document
    const handleDeleteDoc = async (id) => {
        if (!confirm('શું તમે આ દસ્તાવેજ ડિલીટ કરવા માંગો છો?')) return;
        try {
            await axios.delete(`/api/documents/${id}`);
            fetchDocuments();
            setSelectedDocIds(prev => prev.filter(i => i !== id));
        } catch (err) {
            console.error('Error deleting document:', err);
        }
    };

    return (
        <div className="space-y-6">
            
            {/* Search & Top Action Bar */}
            <div className="glass-panel p-4 sm:p-6 rounded-3xl space-y-4">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    
                    {/* Search Input with Auto-Suggestions */}
                    <div className="relative flex-1">
                        <div className="relative flex items-center">
                            <Search className="absolute left-3.5 w-4 h-4 text-blue-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="દસ્તાવેજ શોધો... (દા.ત. 300 stemp test vyakti, Rajeshwari PAN, Sunrise GST, GEDA)"
                                className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-blue-500 rounded-2xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3.5 text-xs text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Search Suggestions Dropdown */}
                        {suggestions.length > 0 && searchQuery && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl z-30 p-2 space-y-1">
                                <p className="text-[10px] font-semibold text-slate-400 px-2 py-1">
                                    💡 શું તમે આ શોધી રહ્યા છો? (Suggestions):
                                </p>
                                {suggestions.map((sug, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setSearchQuery(sug.query);
                                            setSuggestions([]);
                                        }}
                                        className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-xs text-blue-300 flex items-center justify-between transition cursor-pointer"
                                    >
                                        <span>{sug.title}</span>
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Launch Buttons */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={onOpenCall}
                            className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-2xl shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>AI કૉલ પર માંગો</span>
                        </button>

                        <button
                            onClick={onOpenUpload}
                            className="flex items-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-2xl shadow-lg shadow-blue-600/20 transition cursor-pointer"
                        >
                            <span>+ નવો દસ્તાવેજ</span>
                        </button>
                    </div>
                </div>

                {/* Prominent Company Tabs (Rajeshwari Solar, Sunrise Green, Nilkanth) */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                    <span className="text-xs text-slate-400 flex items-center mr-1">
                        <Building2 className="w-3.5 h-3.5 mr-1 text-blue-400" /> કંપની સેક્શન:
                    </span>

                    <button
                        onClick={() => setSelectedCompanyId('')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                            !selectedCompanyId
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                    >
                        બધી કંપનીઓ (All)
                    </button>

                    {companies.map(c => {
                        const isSel = String(selectedCompanyId) === String(c.id);
                        return (
                            <button
                                key={c.id}
                                onClick={() => setSelectedCompanyId(isSel ? '' : c.id)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                                    isSel
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20 border border-blue-400/40'
                                        : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                                }`}
                            >
                                <span>🏢</span>
                                <span>{c.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Disambiguation Banner (e.g. When searching GEDA) */}
            {disambiguation && (
                <div className="p-4 bg-amber-950/40 border border-amber-600/40 rounded-2xl animate-fadeIn space-y-2">
                    <div className="flex items-center space-x-2 text-amber-300 font-semibold text-xs">
                        <HelpCircle className="w-4 h-4" />
                        <span>કન્ફર્મેશન: તમે '{disambiguation.doc_type?.toUpperCase()}' માંગ્યું છે, આ દસ્તાવેજ નીચેની કંપનીઓમાં છે:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {disambiguation.companies.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setSearchQuery(c.name + ' ' + disambiguation.doc_type)}
                                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1"
                            >
                                <Building2 className="w-3.5 h-3.5" />
                                <span>{c.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Batch Action Toolbar */}
            {selectedDocIds.length > 0 && (
                <div className="sticky top-20 z-20 glass-panel p-3 rounded-2xl border border-blue-500/30 bg-blue-950/40 flex items-center justify-between shadow-xl animate-fadeIn">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-blue-200">
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                        <span>{selectedDocIds.length} દસ્તાવેજો સિલેક્ટ કર્યા છે</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handleCreateZip('single_master_zip')}
                            disabled={isCreatingZip}
                            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                        >
                            <Archive className="w-3.5 h-3.5" />
                            <span>{isCreatingZip ? 'ZIP બને છે...' : 'કંપની વાઇઝ Master ZIP બનાવો'}</span>
                        </button>

                        <button
                            onClick={() => handleCreateZip('separate_company_zips')}
                            disabled={isCreatingZip}
                            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition cursor-pointer"
                        >
                            <span>અલગ અલગ ZIP બનાવો</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Generated ZIP Modal Notification */}
            {zipSuccessData && (
                <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Archive className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white">ZIP Bundle તૈયાર થઈ ગયું છે!</p>
                            <p className="text-[11px] text-emerald-300">
                                {zipSuccessData.documents_count} ફાઇલો • {zipSuccessData.file_size_formatted}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <a
                            href={zipSuccessData.download_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center space-x-1.5"
                        >
                            <Download className="w-4 h-4" />
                            <span>ડાઉનલોડ કરો</span>
                        </a>
                        <button
                            onClick={() => setZipSuccessData(null)}
                            className="p-2 text-slate-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Documents Grid / Table */}
            <div>
                <div className="flex items-center justify-between pb-3 px-1">
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={toggleSelectAll}
                            className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1.5 cursor-pointer"
                        >
                            {selectedDocIds.length === documents.length && documents.length > 0 ? (
                                <CheckSquare className="w-4 h-4 text-blue-500" />
                            ) : (
                                <Square className="w-4 h-4 text-slate-600" />
                            )}
                            <span>બધા સિલેક્ટ કરો ({documents.length})</span>
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">
                        {isLoading ? 'લોડ થઈ રહ્યું છે...' : `કુલ ${documents.length} દસ્તાવેજ મળ્યા`}
                    </p>
                </div>

                {/* Document Cards */}
                {documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents.map((doc) => {
                            const isSelected = selectedDocIds.includes(doc.id);
                            return (
                                <div
                                    key={doc.id}
                                    className={`glass-card p-4 rounded-2xl border transition-all duration-200 hover:border-slate-600 flex flex-col justify-between ${
                                        isSelected ? 'border-blue-500 ring-1 ring-blue-500/50 bg-blue-950/20' : 'border-slate-800'
                                    }`}
                                >
                                    <div>
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => toggleSelectDoc(doc.id)}
                                                    className="cursor-pointer"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="w-4 h-4 text-blue-500" />
                                                    ) : (
                                                        <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                                                    )}
                                                </button>
                                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-lg border border-blue-500/20">
                                                    {doc.doc_type?.toUpperCase()}
                                                </span>
                                                {doc.stamp_value ? (
                                                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 text-[10px] font-bold rounded-lg border border-amber-500/20">
                                                        ₹{doc.stamp_value} સ્ટેમ્પ
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={() => setPreviewDoc(doc)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                                                    title="OCR Content જુઓ"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDoc(doc.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                                                    title="ડિલીટ કરો"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Document Title */}
                                        <h4 className="text-sm font-bold text-white mt-2.5 line-clamp-1">
                                            {doc.title}
                                        </h4>

                                        {/* Company & Folder Info */}
                                        <div className="flex items-center space-x-2 mt-1 text-xs text-slate-400">
                                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="truncate">{doc.company?.name || 'જનરલ દસ્તાવેજ'}</span>
                                            {doc.folder && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-slate-500 truncate">{doc.folder.name}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* OCR Content Snippet (Deep search proof) */}
                                        {doc.ocr_text && (
                                            <div className="mt-2.5 p-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
                                                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-mono">
                                                    {doc.ocr_text}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Footer */}
                                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                                        <span className="text-[11px] text-slate-500">
                                            {doc.file_size_formatted}
                                        </span>
                                        <a
                                            href={`/api/documents/${doc.id}/download`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center space-x-1 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            <span>ડાઉનલોડ</span>
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="p-12 text-center glass-panel rounded-3xl space-y-3">
                        <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                        <h3 className="text-base font-bold text-slate-300">કોઈ દસ્તાવેજ મળ્યો નથી</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            તમારા સર્ચ કે ફિલ્ટર સાથે મેળ ખાતો કોઈ દસ્તાવેજ નથી. નવો દસ્તાવેજ અપલોડ કરો અથવા AI કૉલ દ્વારા માંગો.
                        </p>
                        <button
                            onClick={onOpenUpload}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition inline-block"
                        >
                            + નવો દસ્તાવેજ અપલોડ કરો
                        </button>
                    </div>
                )}
            </div>

            {/* Document Detail & OCR Preview Modal */}
            {previewDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-base font-bold text-white">{previewDoc.title}</h3>
                                <p className="text-xs text-slate-400">
                                    કંપની: {previewDoc.company?.name || 'N/A'} • પ્રકાર: {previewDoc.doc_type?.toUpperCase()}
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewDoc(null)}
                                className="p-1.5 text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <p className="text-xs font-semibold text-slate-300 mb-1.5">
                                🔍 દસ્તાવેજની અંદરનું લખાણ (Deep OCR Extracted Text):
                            </p>
                            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 max-h-60 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {previewDoc.ocr_text || 'કોઈ લખાણ મળ્યું નથી.'}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                            <a
                                href={`/api/documents/${previewDoc.id}/download`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition"
                            >
                                ફાઇલ ડાઉનલોડ કરો
                            </a>
                            <button
                                onClick={() => setPreviewDoc(null)}
                                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-700 transition"
                            >
                                બંધ કરો
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
