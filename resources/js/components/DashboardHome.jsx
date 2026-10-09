import React, { useState } from 'react';
import { 
    Search, 
    Sparkles, 
    FileText, 
    Layers, 
    Building2, 
    ChevronRight, 
    Folder, 
    ArrowRight,
    Camera,
    UploadCloud,
    PhoneCall,
    ShieldCheck,
    CheckCircle2,
    Bot
} from 'lucide-react';

export default function DashboardHome({ 
    stats, 
    companies, 
    onOpenCall, 
    onOpenUpload, 
    onNavigateToFiles 
}) {
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        onNavigateToFiles({ search: searchQuery });
    };

    const totalDocs = stats?.total_documents ?? 0;
    const stampCount = stats?.stamp_papers_count ?? 0;

    return (
        <div className="space-y-4 max-w-5xl mx-auto">
            {/* 1. Telegram Active Status Bar */}
            <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-3 flex items-center justify-between shadow-xs text-xs">
                <div className="flex items-center space-x-2.5">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-slate-800">Telegram Bot</span>
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Active
                        </span>
                    </div>
                </div>

                <div className="flex items-center space-x-3 text-slate-500 font-medium">
                    <div className="hidden sm:flex items-center space-x-1 text-slate-700">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>સુરક્ષિત ક્લાઉડ સિંક</span>
                    </div>
                    <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                    <span className="text-[11px] text-slate-400">Gemini Live & Whisper AI</span>
                </div>
            </div>

            {/* 2. Top Search & Quick Actions Bar */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
                <form onSubmit={handleSearchSubmit} className="relative">
                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="દસ્તાવેજ શોધો... (દા.ત. 300 stamp, Rajeshwari, Sunrise)"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl pl-11 pr-24 py-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition shadow-inner"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                        શોધો
                    </button>
                </form>

                {/* 3 Quick Action Buttons: AI Call (Green), CamScanner (Amber), Upload (Blue) */}
                <div className="grid grid-cols-3 gap-2.5 pt-0.5">
                    <button
                        onClick={onOpenCall}
                        className="flex items-center justify-center space-x-1.5 py-3 bg-[#2e7d32] hover:bg-[#256629] text-white text-xs font-bold rounded-2xl shadow-sm transition active:scale-95 cursor-pointer"
                    >
                        <PhoneCall className="w-4 h-4" />
                        <span>AI કૉલ</span>
                    </button>

                    <button
                        onClick={() => onOpenUpload('camera')}
                        className="flex items-center justify-center space-x-1.5 py-3 bg-[#e65100] hover:bg-[#bf4300] text-white text-xs font-bold rounded-2xl shadow-sm transition active:scale-95 cursor-pointer"
                    >
                        <Camera className="w-4 h-4" />
                        <span>📷 CamScanner</span>
                    </button>

                    <button
                        onClick={() => onOpenUpload('file')}
                        className="flex items-center justify-center space-x-1.5 py-3 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-2xl shadow-sm transition active:scale-95 cursor-pointer"
                    >
                        <UploadCloud className="w-4 h-4" />
                        <span>+ અપલોડ</span>
                    </button>
                </div>
            </div>

            {/* 3. ONLY 2 STATS CARDS (User specified: "total dastavej and , stemp itna show hoga") */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Card 1: કુલ દસ્તાવેજો */}
                <div 
                    onClick={() => onNavigateToFiles({})}
                    className="p-4 sm:p-5 rounded-3xl bg-[#edf5ff] border border-blue-100 flex items-center justify-between cursor-pointer hover:shadow-md transition active:scale-98"
                >
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-700">કુલ દસ્તાવેજો</p>
                        <p className="text-2xl sm:text-3xl font-black text-slate-900">{totalDocs}</p>
                        <p className="text-[10px] text-blue-600 font-semibold flex items-center space-x-0.5">
                            <span>જુઓ</span>
                            <ChevronRight className="w-3 h-3 inline" />
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-600 flex items-center justify-center">
                        <Layers className="w-6 h-6" />
                    </div>
                </div>

                {/* Card 2: સ્ટેમ્પ પેપર */}
                <div 
                    onClick={() => onNavigateToFiles({ docType: 'stamp_paper' })}
                    className="p-4 sm:p-5 rounded-3xl bg-[#fff8ed] border border-amber-100 flex items-center justify-between cursor-pointer hover:shadow-md transition active:scale-98"
                >
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-700">સ્ટેમ્પ પેપર (Stamps)</p>
                        <p className="text-2xl sm:text-3xl font-black text-slate-900">{stampCount}</p>
                        <p className="text-[10px] text-amber-700 font-semibold flex items-center space-x-0.5">
                            <span>જુઓ</span>
                            <ChevronRight className="w-3 h-3 inline" />
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* 4. Dedicated "My Files" Launcher Section (Documents only inside My Files) */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                                <Folder className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900">
                                My Files (દસ્તાવેજો મેનેજર)
                            </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            બધા દસ્તાવેજો, કંપની ફોલ્ડર્સ, PDF ફાઈલો જોવા, મુવ, કૉપી અને ડિલીટ કરવા માટે નીચે ક્લિક કરો.
                        </p>
                    </div>

                    <button
                        onClick={() => onNavigateToFiles({})}
                        className="hidden sm:flex items-center space-x-1 px-4 py-2 bg-[#2e7d32] hover:bg-[#256629] text-white text-xs font-bold rounded-2xl shadow-sm transition cursor-pointer"
                    >
                        <span>ઓપન My Files</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Company Folders Quick Navigation */}
                <div>
                    <p className="text-xs font-bold text-slate-700 mb-2 flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>કંપની ફોલ્ડર્સ પસંદ કરો:</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {companies && companies.length > 0 ? (
                            companies.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => onNavigateToFiles({ companyId: String(c.id) })}
                                    className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 text-left transition flex items-center justify-between cursor-pointer group"
                                >
                                    <div className="flex items-center space-x-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center group-hover:text-emerald-700">
                                            <Folder className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">
                                                {c.name}
                                            </p>
                                            <p className="text-[10px] text-slate-400">ફોલ્ડર ખોલો</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
                                </button>
                            ))
                        ) : (
                            <div className="col-span-3 text-xs text-slate-400 text-center py-2">
                                કંપનીઓ લોડ થઈ રહી છે...
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Open My Files Button */}
                <button
                    onClick={() => onNavigateToFiles({})}
                    className="w-full sm:hidden py-3 bg-[#2e7d32] hover:bg-[#256629] text-white text-xs font-bold rounded-2xl shadow-sm transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
                >
                    <Folder className="w-4 h-4" />
                    <span>📁 ઓપન My Files (બધા દસ્તાવેજો જુઓ)</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            {/* 5. Features Summary Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-4 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800">DocVoice AI Assistant</p>
                        <p className="text-[11px] text-slate-500">ટેલિગ્રામ પર વૉઇસ બોલીને કે કૉલ કરીને કોઈ પણ દસ્તાવેજ તાત્કાલિક મેળવો.</p>
                    </div>
                </div>
                <button
                    onClick={onOpenCall}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold rounded-xl transition text-xs flex items-center space-x-1.5 flex-shrink-0"
                >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>કૉલ ટેસ્ટ કરો</span>
                </button>
            </div>
        </div>
    );
}
