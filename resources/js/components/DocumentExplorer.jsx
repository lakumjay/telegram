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
    CheckCircle2,
    Send,
    Copy,
    Scissors,
    LayoutGrid,
    List,
    Share2,
    MessageSquare,
    ShieldCheck,
    Layers
} from 'lucide-react';
import axios from 'axios';

export default function DocumentExplorer({ 
    onOpenUpload, 
    onOpenCall,
    initialCompanyId = '',
    initialDocType = '',
    initialSearch = '',
    isMyFilesPage = true
}) {
    const [documents, setDocuments] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);
    const [selectedFolderId, setSelectedFolderId] = useState('');
    const [selectedDocType, setSelectedDocType] = useState(initialDocType);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [suggestions, setSuggestions] = useState([]);
    const [disambiguation, setDisambiguation] = useState(null);
    const [selectedDocIds, setSelectedDocIds] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [isCreatingZip, setIsCreatingZip] = useState(false);
    const [zipSuccessData, setZipSuccessData] = useState(null);

    // Sync initial props if they change
    useEffect(() => {
        if (initialCompanyId !== undefined) setSelectedCompanyId(initialCompanyId);
        if (initialDocType !== undefined) setSelectedDocType(initialDocType);
        if (initialSearch !== undefined) setSearchQuery(initialSearch);
    }, [initialCompanyId, initialDocType, initialSearch]);

    // Batch delete multiple selected documents
    const handleBatchDelete = async () => {
        if (selectedDocIds.length === 0) return;
        if (!confirm(`શું તમે આ ${selectedDocIds.length} દસ્તાવેજો ડિલીટ કરવા માંગો છો?`)) return;
        setIsLoading(true);
        try {
            for (const id of selectedDocIds) {
                await axios.delete(`/api/documents/${id}`);
            }
            setSelectedDocIds([]);
            fetchDocuments();
            showToast(`સિલેક્ટ કરેલા ${selectedDocIds.length} દસ્તાવેજો સફળતાપૂર્વક ડિલીટ થયા!`);
        } catch (err) {
            console.error('Batch delete error:', err);
            showToast('ડિલીટ કરવામાં ભૂલ આવી.', true);
        } finally {
            setIsLoading(false);
        }
    };

    // Mobile File Manager: View mode (grid or list)
    const [viewMode, setViewMode] = useState('grid');
    // Move / Copy modal state
    const [moveCopyTarget, setMoveCopyTarget] = useState(null);
    const [targetCompanyId, setTargetCompanyId] = useState('');
    const [actionMessage, setActionMessage] = useState(null);

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
            showToast('દસ્તાવેજ સફળતાપૂર્વક ડિલીટ થયો!');
        } catch (err) {
            console.error('Error deleting document:', err);
            showToast('ડિલીટ કરવામાં ભૂલ આવી.', true);
        }
    };

    // Show temporary toast message
    const showToast = (msg, isErr = false) => {
        setActionMessage({ text: msg, error: isErr });
        setTimeout(() => setActionMessage(null), 3500);
    };

    // Direct Telegram Sharing
    const [sharingDocId, setSharingDocId] = useState(null);
    const handleShareToTelegram = async (docId) => {
        setSharingDocId(docId);
        try {
            const res = await axios.post(`/api/documents/${docId}/share-telegram`);
            if (res.data.success) {
                showToast(res.data.message || 'દસ્તાવેજ ટેલિગ્રામમાં મોકલાઈ ગયો છે!');
            } else {
                showToast(res.data.message || 'ટેલિગ્રામમાં મોકલવામાં સમસ્યા આવી.', true);
            }
        } catch (err) {
            console.error('Share to Telegram failed:', err);
            showToast('ટેલિગ્રામ શેર કરવામાં ભૂલ આવી.', true);
        } finally {
            setSharingDocId(null);
        }
    };

    // Execute Move or Copy
    const [isExecutingMoveCopy, setIsExecutingMoveCopy] = useState(false);
    const handleMoveCopySubmit = async () => {
        if (!moveCopyTarget || !targetCompanyId) return;
        setIsExecutingMoveCopy(true);
        try {
            const res = await axios.post(`/api/documents/${moveCopyTarget.doc.id}/move-or-copy`, {
                action: moveCopyTarget.action, // 'move' or 'copy'
                company_id: targetCompanyId
            });
            if (res.data.success) {
                showToast(res.data.message);
                setMoveCopyTarget(null);
                setTargetCompanyId('');
                fetchDocuments();
            } else {
                showToast(res.data.message || 'ઓપરેશન નિષ્ફળ ગયું.', true);
            }
        } catch (err) {
            console.error('Move/Copy failed:', err);
            showToast('ફાઇલ ખસેડવામાં કે કૉપી કરવામાં ભૂલ આવી.', true);
        } finally {
            setIsExecutingMoveCopy(false);
        }
    };

    // Default companies so tabs always show even if database is empty
    const displayCompanies = companies.length > 0 ? companies : [
        { id: '1', name: 'Rajeshwari Solar' },
        { id: '2', name: 'Sunrise Green' },
        { id: '3', name: 'Nilkanth' }
    ];

    return (
        <div className="space-y-4 max-w-xl mx-auto sm:max-w-7xl">
            
            {/* My Files Top Bar */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-lg">
                        📁
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                            My Files (દસ્તાવેજો મેનેજર)
                        </h2>
                        <p className="text-xs text-slate-500">
                            {selectedCompanyId 
                                ? `કંપની: ${displayCompanies.find(c => String(c.id) === String(selectedCompanyId))?.name || 'પસંદ કરેલ'} • ${documents.length} દસ્તાવેજો` 
                                : `તમામ કંપનીઓ • કુલ ${documents.length} દસ્તાવેજો`
                            }
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => onOpenUpload('camera')}
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-2xl border border-amber-200 transition cursor-pointer"
                    >
                        <span>📷 CamScanner</span>
                    </button>
                    <button
                        onClick={() => onOpenUpload('file')}
                        className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl shadow-xs transition cursor-pointer"
                    >
                        <span>+ નવો અપલોડ</span>
                    </button>
                </div>
            </div>

            {/* Search Bar & Action Buttons (Matching user's reference photo) */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="દસ્તાવેજ શોધો... (દા.ત. 300 stamp test vyakti, Rajeshwari PA)"
                        className="w-full bg-[#f8fafc] border border-slate-200 focus:border-emerald-500 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-inner"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3.5 top-3.5 text-xs text-slate-400 hover:text-slate-600"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && searchQuery && (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-2 space-y-1">
                        <p className="text-[10px] font-semibold text-slate-400 px-2 py-1">
                            💡 Suggestions:
                        </p>
                        {suggestions.map((sug, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setSearchQuery(sug.query);
                                    setSuggestions([]);
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-50 text-xs text-emerald-700 flex items-center justify-between transition cursor-pointer"
                            >
                                <span>{sug.title}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Action Buttons: AI કૉલ (Green), CamScanner (Amber/Emerald), and Upload (Blue) */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                        onClick={onOpenCall}
                        className="flex items-center justify-center space-x-1.5 py-3 bg-[#2e7d32] hover:bg-[#256629] text-white text-[11px] font-bold rounded-2xl shadow-sm transition active:scale-95 cursor-pointer"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI કૉલ</span>
                    </button>

                    <button
                        onClick={onOpenUpload}
                        className="flex items-center justify-center space-x-1.5 py-3 bg-[#e65100] hover:bg-[#bf4300] text-white text-[11px] font-bold rounded-2xl shadow-sm transition active:scale-95 cursor-pointer"
                    >
                        <span>📷 CamScanner</span>
                    </button>

                    <button
                        onClick={onOpenUpload}
                        className="flex items-center justify-center space-x-1.5 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-bold rounded-2xl shadow-sm transition active:scale-95 cursor-pointer"
                    >
                        <span>+ અપલોડ</span>
                    </button>
                </div>
            </div>

            {/* Company Selection Header & Tabs */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-slate-600" />
                    <span className="text-xs font-bold text-slate-800">
                        કંપની સિલેક્ટ કરો ({displayCompanies.length})
                    </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-1.5">
                    <button
                        onClick={() => setSelectedCompanyId('')}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                            !selectedCompanyId 
                                ? 'bg-[#2f6f4e] text-white shadow-sm' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        All
                    </button>
                    {displayCompanies.map((c) => {
                        const isSel = String(selectedCompanyId) === String(c.id);
                        return (
                            <button
                                key={c.id}
                                onClick={() => setSelectedCompanyId(isSel ? '' : String(c.id))}
                                className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                                    isSel
                                        ? 'bg-[#2f6f4e] text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                {c.name}
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
                <div className="sticky top-20 z-20 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xl flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        <span>{selectedDocIds.length} દસ્તાવેજ પસંદ કરેલ</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Multiple Delete Button */}
                        <button
                            onClick={handleBatchDelete}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition cursor-pointer"
                            title="સિલેક્ટ કરેલા બધા દસ્તાવેજ ડિલીટ કરો"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ડિલીટ ({selectedDocIds.length})</span>
                        </button>

                        {/* Master ZIP Button */}
                        <button
                            onClick={() => handleCreateZip('single_master_zip')}
                            disabled={isCreatingZip}
                            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#2e7d32] hover:bg-[#256629] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                        >
                            <Archive className="w-3.5 h-3.5" />
                            <span>{isCreatingZip ? 'ZIP...' : 'Master ZIP'}</span>
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

            {/* Toast Notification */}
            {actionMessage && (
                <div className={`p-3.5 rounded-2xl flex items-center justify-between animate-fadeIn text-xs font-semibold shadow-lg ${
                    actionMessage.error 
                        ? 'bg-rose-950/80 border border-rose-500/50 text-rose-200' 
                        : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
                }`}>
                    <span>{actionMessage.text}</span>
                    <button onClick={() => setActionMessage(null)} className="ml-2 text-slate-400 hover:text-white">✕</button>
                </div>
            )}

            {/* Documents Grid / Table Toolbar */}
            <div>
                <div className="flex items-center justify-between pb-3 px-1">
                    <div className="flex items-center space-x-3">
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

                    <div className="flex items-center space-x-3">
                        <p className="hidden sm:block text-xs text-slate-500">
                            {isLoading ? 'લોડ થઈ રહ્યું છે...' : `કુલ ${documents.length} દસ્તાવેજ`}
                        </p>

                        {/* View Switcher: Grid vs List */}
                        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                                    viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                }`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                                    viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                                }`}
                                title="List View"
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Documents Display */}
                {documents.length > 0 ? (
                    viewMode === 'grid' ? (
                        /* GRID VIEW */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {documents.map((doc) => {
                                const isSelected = selectedDocIds.includes(doc.id);
                                return (
                                    <div
                                        key={doc.id}
                                        className={`bg-white p-4 rounded-3xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                                            isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30' : 'border-slate-200/80 shadow-sm'
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
                                                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                                        )}
                                                    </button>
                                                    <span className="px-2.5 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-lg shadow-xs">
                                                        {doc.doc_type?.toUpperCase()}
                                                    </span>
                                                    {doc.stamp_value ? (
                                                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-200">
                                                            ₹{doc.stamp_value} સ્ટેમ્પ
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <div className="flex items-center space-x-1">
                                                    <button
                                                        onClick={() => setPreviewDoc(doc)}
                                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                                                        title="OCR જુઓ"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteDoc(doc.id)}
                                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        title="ડિલીટ"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Document Title matching photo */}
                                            <h4 className="text-sm font-bold text-slate-900 mt-3 line-clamp-1">
                                                {doc.title}
                                            </h4>

                                            {/* Date & file type matching photo */}
                                            <div className="flex items-center space-x-2 mt-1.5 text-[11px] text-slate-500">
                                                <span>📅 {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '12 Oct 2025'}</span>
                                                <span>|</span>
                                                <span className="uppercase font-bold text-slate-600">PDF</span>
                                                <span>{doc.file_size_formatted}</span>
                                            </div>
                                            {/* Company Info */}
                                            <div className="flex items-center space-x-1.5 mt-1 text-xs text-slate-500">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="truncate">{doc.company?.name || 'જનરલ દસ્તાવેજ'}</span>
                                            </div>
                                        </div>

                                        {/* File Actions (Move, Copy, Telegram Share, Download) */}
                                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1">
                                            <div className="flex items-center space-x-1.5">
                                                <button
                                                    onClick={() => {
                                                        setMoveCopyTarget({ doc, action: 'move' });
                                                        setTargetCompanyId(doc.company_id ? String(doc.company_id) : '');
                                                    }}
                                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-xl transition flex items-center space-x-1 border border-amber-200"
                                                    title="ખસેડો (Move)"
                                                >
                                                    <Scissors className="w-3 h-3 text-amber-600" />
                                                    <span>Move</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setMoveCopyTarget({ doc, action: 'copy' });
                                                        setTargetCompanyId(doc.company_id ? String(doc.company_id) : '');
                                                    }}
                                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold rounded-xl transition flex items-center space-x-1 border border-blue-200"
                                                    title="કૉપી કરો (Copy)"
                                                >
                                                    <Copy className="w-3 h-3 text-blue-600" />
                                                    <span>Copy</span>
                                                </button>

                                                <button
                                                    onClick={() => handleShareToTelegram(doc.id)}
                                                    disabled={sharingDocId === doc.id}
                                                    className="px-2.5 py-1 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#0088cc] text-[11px] font-bold rounded-xl transition flex items-center space-x-1"
                                                    title="ટેલિગ્રામમાં મોકલો"
                                                >
                                                    <Send className="w-3 h-3 text-[#0088cc]" />
                                                    <span>{sharingDocId === doc.id ? '...' : 'Telegram'}</span>
                                                </button>
                                            </div>

                                            <a
                                                href={`/api/documents/${doc.id}/download`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                                                title="ડાઉનલોડ"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* LIST VIEW (Mobile File Manager Style) */
                        <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 divide-y divide-slate-100 shadow-xs">
                            {documents.map((doc) => {
                                const isSelected = selectedDocIds.includes(doc.id);
                                return (
                                    <div
                                        key={doc.id}
                                        className={`p-3 sm:p-3.5 flex items-center justify-between hover:bg-slate-50 transition ${
                                            isSelected ? 'bg-emerald-50/50' : ''
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
                                            <button
                                                onClick={() => toggleSelectDoc(doc.id)}
                                                className="cursor-pointer"
                                            >
                                                {isSelected ? (
                                                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                                )}
                                            </button>

                                            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                                <FileText className="w-4 h-4" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center space-x-2">
                                                    <h4 className="text-xs font-bold text-slate-900 truncate">
                                                        {doc.title}
                                                    </h4>
                                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded border border-blue-200 flex-shrink-0">
                                                        {doc.doc_type?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-500 truncate">
                                                    <span>{doc.company?.name || 'જનરલ દસ્તાવેજ'}</span>
                                                    <span>•</span>
                                                    <span>{doc.file_size_formatted}</span>
                                                    {doc.stamp_value ? (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-amber-700 font-bold">₹{doc.stamp_value} સ્ટેમ્પ</span>
                                                        </>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons on row */}
                                        <div className="flex items-center space-x-1 flex-shrink-0">
                                            <button
                                                onClick={() => {
                                                    setMoveCopyTarget({ doc, action: 'move' });
                                                    setTargetCompanyId(doc.company_id ? String(doc.company_id) : '');
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                                title="Move"
                                            >
                                                <Scissors className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setMoveCopyTarget({ doc, action: 'copy' });
                                                    setTargetCompanyId(doc.company_id ? String(doc.company_id) : '');
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                                                title="Copy"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={() => handleShareToTelegram(doc.id)}
                                                disabled={sharingDocId === doc.id}
                                                className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition"
                                                title="ટેલિગ્રામમાં મોકલો"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={() => setPreviewDoc(doc)}
                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                                                title="OCR જુઓ"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>

                                            <a
                                                href={`/api/documents/${doc.id}/download`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                title="ડાઉનલોડ"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </a>

                                            <button
                                                onClick={() => handleDeleteDoc(doc.id)}
                                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="ડિલીટ"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
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

            {/* Move / Copy Modal Dialog */}
            {moveCopyTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                                    {moveCopyTarget.action === 'move' ? <Scissors className="w-5 h-5 text-amber-400" /> : <Copy className="w-5 h-5 text-blue-400" />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">
                                        {moveCopyTarget.action === 'move' ? 'દસ્તાવેજ ખસેડો (Move File)' : 'દસ્તાવેજ કૉપી કરો (Copy File)'}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 truncate max-w-xs">
                                        {moveCopyTarget.doc.title}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setMoveCopyTarget(null)}
                                className="p-1.5 text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-semibold text-slate-300">
                                લક્ષ્ય કંપની (Target Company) પસંદ કરો:
                            </label>
                            <div className="space-y-2">
                                {companies.map((c) => (
                                    <label
                                        key={c.id}
                                        className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                                            String(targetCompanyId) === String(c.id)
                                                ? 'bg-blue-950/40 border-blue-500 text-white'
                                                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Building2 className="w-4 h-4 text-blue-400" />
                                            <span className="text-xs font-medium">{c.name}</span>
                                        </div>
                                        <input
                                            type="radio"
                                            name="target_company"
                                            value={c.id}
                                            checked={String(targetCompanyId) === String(c.id)}
                                            onChange={() => setTargetCompanyId(String(c.id))}
                                            className="accent-blue-500"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                            <button
                                onClick={() => setMoveCopyTarget(null)}
                                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-700 transition"
                            >
                                રદ કરો
                            </button>
                            <button
                                onClick={handleMoveCopySubmit}
                                disabled={!targetCompanyId || isExecutingMoveCopy}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition"
                            >
                                {isExecutingMoveCopy ? 'પ્રક્રિયા ચાલુ છે...' : (moveCopyTarget.action === 'move' ? 'અહીં ખસેડો' : 'અહીં કૉપી કરો')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
