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
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            await axios.delete(`/api/documents/${id}`);
            fetchDocuments();
            setSelectedDocIds(prev => prev.filter(i => i !== id));
            showToast('Document deleted successfully!');
        } catch (err) {
            console.error('Error deleting document:', err);
            showToast('Failed to delete document.', true);
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
                showToast(res.data.message || 'Document sent to Telegram!');
            } else {
                showToast(res.data.message || 'Failed to send to Telegram.', true);
            }
        } catch (err) {
            console.error('Share to Telegram failed:', err);
            showToast('Failed to send to Telegram.', true);
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
                showToast(res.data.message || 'Operation completed successfully.');
                setMoveCopyTarget(null);
                setTargetCompanyId('');
                fetchDocuments();
            } else {
                showToast(res.data.message || 'Operation failed.', true);
            }
        } catch (err) {
            console.error('Move/Copy failed:', err);
            showToast('Failed to move or copy file.', true);
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
        <div className="space-y-3.5 max-w-4xl mx-auto">
            
            {/* Header: My Files & Company Tabs */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3 sm:p-4 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                            📁
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                                My Files
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                {selectedCompanyId 
                                    ? `Company: ${displayCompanies.find(c => String(c.id) === String(selectedCompanyId))?.name || 'Selected'} • ${documents.length} files` 
                                    : `All Companies • ${documents.length} files`
                                }
                            </p>
                        </div>
                    </div>

                    {/* Company Filter Tabs (Compact) */}
                    <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
                        <button
                            onClick={() => setSelectedCompanyId('')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                !selectedCompanyId 
                                    ? 'bg-slate-900 text-white shadow-2xs' 
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
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                                        isSel
                                            ? 'bg-slate-900 text-white shadow-2xs'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    {c.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Sleek Compact Search Bar (NO duplicate buttons) */}
                <div className="relative flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search files by title, company, or keyword..."
                        className="w-full bg-slate-50/70 border border-slate-200/90 focus:border-blue-500 focus:bg-white rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-600"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && searchQuery && (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1">
                        <p className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 uppercase tracking-wider">
                            Suggestions:
                        </p>
                        {suggestions.map((sug, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setSearchQuery(sug.query);
                                    setSuggestions([]);
                                }}
                                className="w-full text-left px-3 py-1 rounded-lg hover:bg-slate-50 text-xs text-blue-600 flex items-center justify-between transition cursor-pointer"
                            >
                                <span>{sug.title}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Disambiguation Banner */}
            {disambiguation && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-amber-900 font-semibold">
                        <HelpCircle className="w-4 h-4 text-amber-600" />
                        <span>Confirmation: You searched for '{disambiguation.doc_type?.toUpperCase()}'. Select company:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {disambiguation.companies.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => setSearchQuery(c.name + ' ' + disambiguation.doc_type)}
                                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1"
                            >
                                <Building2 className="w-3 h-3 text-amber-700" />
                                <span>{c.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Batch Action Toolbar */}
            {selectedDocIds.length > 0 && (
                <div className="sticky top-20 z-20 bg-white p-3 rounded-xl border border-slate-200 shadow-md flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        <span>{selectedDocIds.length} selected</span>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* Multiple Delete Button */}
                        <button
                            onClick={handleBatchDelete}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg border border-red-200 transition cursor-pointer"
                            title="Delete selected documents"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete ({selectedDocIds.length})</span>
                        </button>

                        {/* Master ZIP Button */}
                        <button
                            onClick={() => handleCreateZip('single_master_zip')}
                            disabled={isCreatingZip}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition cursor-pointer"
                        >
                            <Archive className="w-3.5 h-3.5" />
                            <span>{isCreatingZip ? 'Exporting...' : 'Export ZIP'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Generated ZIP Modal Notification */}
            {zipSuccessData && (
                <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Archive className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white">ZIP Archive Ready!</p>
                            <p className="text-[11px] text-emerald-300">
                                {zipSuccessData.documents_count} files • {zipSuccessData.file_size_formatted}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <a
                            href={zipSuccessData.download_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center space-x-1.5"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download ZIP</span>
                        </a>
                        <button
                            onClick={() => setZipSuccessData(null)}
                            className="p-1.5 text-slate-400 hover:text-white"
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
                <div className="flex items-center justify-between pb-2.5 px-1">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={toggleSelectAll}
                            className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1.5 cursor-pointer font-medium"
                        >
                            {selectedDocIds.length === documents.length && documents.length > 0 ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                            )}
                            <span>Select All ({documents.length})</span>
                        </button>
                    </div>

                    <div className="flex items-center space-x-3">
                        <p className="hidden sm:block text-xs text-slate-400 font-medium">
                            {isLoading ? 'Loading...' : `Total ${documents.length} files`}
                        </p>

                        {/* View Switcher: Grid vs List */}
                        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1 rounded-md text-xs transition cursor-pointer ${
                                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                                }`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1 rounded-md text-xs transition cursor-pointer ${
                                    viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                                }`}
                                title="List View"
                            >
                                <List className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Documents Display */}
                {documents.length > 0 ? (
                    viewMode === 'grid' ? (
                        /* GRID VIEW */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {documents.map((doc) => {
                                const isSelected = selectedDocIds.includes(doc.id);
                                return (
                                    <div
                                        key={doc.id}
                                        className={`bg-white p-3.5 rounded-2xl border transition-all duration-150 hover:shadow-xs flex flex-col justify-between ${
                                            isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200/80 shadow-2xs'
                                        }`}
                                    >
                                        <div>
                                            {/* Card Header */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                                    <button
                                                        onClick={() => toggleSelectDoc(doc.id)}
                                                        className="cursor-pointer"
                                                    >
                                                        {isSelected ? (
                                                            <CheckSquare className="w-4 h-4 text-blue-600" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                                        )}
                                                    </button>
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                                                        {doc.doc_type?.toUpperCase()}
                                                    </span>
                                                    {doc.stamp_value ? (
                                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-md border border-amber-200">
                                                            ₹{doc.stamp_value} Stamp
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <div className="flex items-center space-x-0.5">
                                                    <button
                                                        onClick={() => setPreviewDoc(doc)}
                                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition"
                                                        title="Preview OCR"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteDoc(doc.id)}
                                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Document Title */}
                                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                                                {doc.title}
                                            </h4>

                                            {/* Date & file type */}
                                            <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-400">
                                                <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'}</span>
                                                <span>•</span>
                                                <span className="uppercase font-semibold text-slate-600">PDF</span>
                                                <span>•</span>
                                                <span>{doc.file_size_formatted}</span>
                                            </div>
                                            {/* Company Info */}
                                            <div className="flex items-center space-x-1.5 mt-1 text-xs text-slate-600">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="truncate font-medium">{doc.company?.name || 'General'}</span>
                                            </div>
                                        </div>

                                        {/* File Actions (Move, Copy, Telegram Share, Download) */}
                                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={() => {
                                                        setMoveCopyTarget({ doc, action: 'move' });
                                                        setTargetCompanyId(doc.company_id ? String(doc.company_id) : '');
                                                    }}
                                                    className="px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg transition flex items-center space-x-1 border border-slate-200"
                                                    title="Move"
                                                >
                                                    <Scissors className="w-3 h-3 text-slate-500" />
                                                    <span>Move</span>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setMoveCopyTarget({ doc, action: 'copy' });
                                                        setTargetCompanyId(doc.company_id ? String(doc.company_id) : '');
                                                    }}
                                                    className="px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg transition flex items-center space-x-1 border border-slate-200"
                                                    title="Copy"
                                                >
                                                    <Copy className="w-3 h-3 text-slate-500" />
                                                    <span>Copy</span>
                                                </button>

                                                <button
                                                    onClick={() => handleShareToTelegram(doc.id)}
                                                    disabled={sharingDocId === doc.id}
                                                    className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-[11px] font-semibold rounded-lg transition flex items-center space-x-1"
                                                    title="Send to Telegram"
                                                >
                                                    <Send className="w-3 h-3 text-sky-600" />
                                                    <span>{sharingDocId === doc.id ? '...' : 'Telegram'}</span>
                                                </button>
                                            </div>

                                            <a
                                                href={`/api/documents/${doc.id}/download`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                title="Download"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* LIST VIEW */
                        <div className="bg-white rounded-xl overflow-hidden border border-slate-200 divide-y divide-slate-100 shadow-2xs">
                            {documents.map((doc) => {
                                const isSelected = selectedDocIds.includes(doc.id);
                                return (
                                    <div
                                        key={doc.id}
                                        className={`p-3 flex items-center justify-between hover:bg-slate-50 transition ${
                                            isSelected ? 'bg-blue-50/30' : ''
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                                            <button
                                                onClick={() => toggleSelectDoc(doc.id)}
                                                className="cursor-pointer"
                                            >
                                                {isSelected ? (
                                                    <CheckSquare className="w-4 h-4 text-blue-600" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                                                )}
                                            </button>

                                            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                                <FileText className="w-4 h-4" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center space-x-2">
                                                    <h4 className="text-xs font-bold text-slate-900 truncate">
                                                        {doc.title}
                                                    </h4>
                                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded flex-shrink-0">
                                                        {doc.doc_type?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-2 mt-0.5 text-[11px] text-slate-400 truncate">
                                                    <span>{doc.company?.name || 'General'}</span>
                                                    <span>•</span>
                                                    <span>{doc.file_size_formatted}</span>
                                                    {doc.stamp_value ? (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-amber-700 font-semibold">₹{doc.stamp_value} Stamp</span>
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
                                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                                title="Move"
                                            >
                                                <Scissors className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setMoveCopyTarget({ doc, action: 'copy' });
                                                    setTargetCompanyId(doc.company_id ? String(doc.company_id) : '');
                                                }}
                                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                                title="Copy"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={() => handleShareToTelegram(doc.id)}
                                                disabled={sharingDocId === doc.id}
                                                className="p-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition"
                                                title="Send to Telegram"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                onClick={() => setPreviewDoc(doc)}
                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                                                title="Preview OCR"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>

                                            <a
                                                href={`/api/documents/${doc.id}/download`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                title="Download"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </a>

                                            <button
                                                onClick={() => handleDeleteDoc(doc.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Delete"
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
                    <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-2.5">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                        <h3 className="text-sm font-bold text-slate-800">No documents found</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            No documents matched your search query or company filter.
                        </p>
                        <button
                            onClick={onOpenUpload}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition inline-block cursor-pointer"
                        >
                            + Upload Document
                        </button>
                    </div>
                )}
            </div>

            {/* Move / Copy Modal Dialog (Light Theme & English) */}
            {moveCopyTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-fadeIn">
                    <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5 shadow-2xl">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center space-x-2">
                                <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                                    {moveCopyTarget.action === 'move' ? <Scissors className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        {moveCopyTarget.action === 'move' ? 'Move Document' : 'Copy Document'}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 truncate max-w-xs">
                                        {moveCopyTarget.doc.title}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setMoveCopyTarget(null)}
                                className="p-1 text-slate-400 hover:text-slate-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2 pt-1">
                            <label className="text-xs font-bold text-slate-700">
                                Select Target Company:
                            </label>
                            <div className="space-y-1.5">
                                {companies.map((c) => (
                                    <label
                                        key={c.id}
                                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                                            String(targetCompanyId) === String(c.id)
                                                ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold'
                                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Building2 className="w-4 h-4 text-slate-400" />
                                            <span>{c.name}</span>
                                        </div>
                                        <input
                                            type="radio"
                                            name="target_company"
                                            value={c.id}
                                            checked={String(targetCompanyId) === String(c.id)}
                                            onChange={() => setTargetCompanyId(String(c.id))}
                                            className="accent-blue-600"
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setMoveCopyTarget(null)}
                                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMoveCopySubmit}
                                disabled={!targetCompanyId || isExecutingMoveCopy}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition"
                            >
                                {isExecutingMoveCopy ? 'Processing...' : (moveCopyTarget.action === 'move' ? 'Move Here' : 'Copy Here')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Detail & OCR Preview Modal (Light Theme & English) */}
            {previewDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-fadeIn">
                    <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5 shadow-2xl">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">{previewDoc.title}</h3>
                                <p className="text-[11px] text-slate-500">
                                    Company: {previewDoc.company?.name || 'General'} • Type: {previewDoc.doc_type?.toUpperCase()}
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewDoc(null)}
                                className="p-1 text-slate-400 hover:text-slate-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-slate-700 mb-1">
                                Extracted OCR Content:
                            </p>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-60 overflow-y-auto font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {previewDoc.ocr_text || 'No extracted text available.'}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                            <a
                                href={`/api/documents/${previewDoc.id}/download`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
                            >
                                Download File
                            </a>
                            <button
                                onClick={() => setPreviewDoc(null)}
                                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
