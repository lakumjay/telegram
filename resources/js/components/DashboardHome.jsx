import React, { useState } from 'react';
import { 
    Search, 
    FileText, 
    Layers, 
    Building2, 
    ShieldCheck, 
    ChevronRight,
    ArrowUpRight
} from 'lucide-react';

export default function DashboardHome({ 
    stats, 
    companies, 
    onNavigateToFiles 
}) {
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            onNavigateToFiles({ search: searchQuery.trim() });
        }
    };

    const totalDocs = stats?.total_documents ?? 0;
    const stampCount = stats?.stamp_papers_count ?? 0;

    return (
        <div className="space-y-3.5 max-w-4xl mx-auto">
            {/* 1. Status Bar */}
            <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-2xs text-xs">
                <div className="flex items-center space-x-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="font-semibold text-slate-800">Telegram Bot</span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] border border-emerald-200">
                        Active
                    </span>
                </div>

                <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Encrypted Cloud Storage</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-medium text-slate-600">Deep OCR Enabled</span>
                </div>
            </div>

            {/* 2. Compact, Sleek Search Bar (Clean search icon, no bulky buttons) */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-2xs">
                <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                    <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder=""
                        className="w-full bg-slate-50/70 border border-slate-200/90 focus:border-blue-500 focus:bg-white rounded-lg pl-9 pr-20 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none transition"
                    />
                    <button
                        type="submit"
                        className="absolute right-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition cursor-pointer"
                    >
                        Search
                    </button>
                </form>
            </div>

            {/* 3. Small, Compact 2 Stats Cards (in English) */}
            <div className="grid grid-cols-2 gap-3">
                {/* Total Documents Card */}
                <div 
                    onClick={() => onNavigateToFiles({})}
                    className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-blue-300 shadow-2xs flex items-center justify-between cursor-pointer transition group"
                >
                    <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Total Documents
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            {totalDocs}
                        </p>
                        <p className="text-[10px] text-blue-600 font-medium group-hover:underline flex items-center space-x-0.5 pt-0.5">
                            <span>View All</span>
                            <ArrowUpRight className="w-2.5 h-2.5 inline" />
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                        <Layers className="w-5 h-5" />
                    </div>
                </div>

                {/* Stamp Papers Card */}
                <div 
                    onClick={() => onNavigateToFiles({ docType: 'stamp_paper' })}
                    className="p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-amber-300 shadow-2xs flex items-center justify-between cursor-pointer transition group"
                >
                    <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Stamp Papers
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                            {stampCount}
                        </p>
                        <p className="text-[10px] text-amber-700 font-medium group-hover:underline flex items-center space-x-0.5 pt-0.5">
                            <span>Filter Stamps</span>
                            <ArrowUpRight className="w-2.5 h-2.5 inline" />
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* 4. Sleek Quick Companies Filter Chips (Clean & Compact) */}
            {companies && companies.length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Company Folders</span>
                        </span>
                        <button
                            onClick={() => onNavigateToFiles({})}
                            className="text-[11px] text-blue-600 font-medium hover:underline flex items-center space-x-0.5"
                        >
                            <span>Open My Files</span>
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                        {companies.map((c) => (
                            <button
                                key={c.id}
                                onClick={() => onNavigateToFiles({ companyId: String(c.id) })}
                                className="px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left transition flex items-center justify-between cursor-pointer text-xs"
                            >
                                <span className="font-semibold text-slate-800 truncate">{c.name}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
