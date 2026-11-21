import React, { useState } from 'react';
import { 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    X,
    Check
} from 'lucide-react';

export default function CustomDatePicker({ 
    selectedDate, 
    onChange 
}) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Parse current selectedDate (YYYY-MM-DD)
    const [viewYear, setViewYear] = useState(() => {
        const d = selectedDate ? new Date(selectedDate) : new Date();
        return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    });
    
    const [viewMonth, setViewMonth] = useState(() => {
        const d = selectedDate ? new Date(selectedDate) : new Date();
        return isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
    });

    const monthNames = [
        'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન', 
        'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
    ];

    const monthNamesEn = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysOfWeek = ['રવિ', 'સોમ', 'મંગળ', 'બુધ', 'ગુરુ', 'શુક્ર', 'શનિ'];

    // Days in current view month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(v => v - 1);
        } else {
            setViewMonth(v => v - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(v => v + 1);
        } else {
            setViewMonth(v => v + 1);
        }
    };

    const handleSelectDay = (day) => {
        const m = String(viewMonth + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        const formatted = `${viewYear}-${m}-${d}`;
        onChange(formatted);
        setIsOpen(false);
    };

    const handleQuickToday = () => {
        const now = new Date();
        const formatted = now.toISOString().split('T')[0];
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
        onChange(formatted);
        setIsOpen(false);
    };

    // Format display date: e.g. "21 નવેમ્બર 2026"
    const formatDisplay = (isoStr) => {
        if (!isoStr) return 'તારીખ પસંદ કરો';
        const parts = isoStr.split('-');
        if (parts.length === 3) {
            const y = parts[0];
            const mIdx = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            return `${d} ${monthNames[mIdx] || parts[1]}, ${y}`;
        }
        return isoStr;
    };

    // Check if day is currently selected
    const isSelected = (day) => {
        if (!selectedDate) return false;
        const [y, m, d] = selectedDate.split('-').map(Number);
        return y === viewYear && (m - 1) === viewMonth && d === day;
    };

    const isToday = (day) => {
        const now = new Date();
        return now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === day;
    };

    return (
        <div className="relative">
            {/* Clickable Custom Calendar Pill (Replacing Browser Default Native Date Input) */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 flex items-center space-x-2 transition cursor-pointer shadow-2xs active:scale-[0.98]"
            >
                <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <CalendarIcon className="w-3.5 h-3.5" />
                </div>
                <span>{formatDisplay(selectedDate)}</span>
            </button>

            {/* Custom Interactive Dropdown Calendar Modal */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-3xl p-4 shadow-2xl w-72 space-y-3 animate-in fade-in zoom-in-95">
                    
                    {/* Calendar Month/Year Header */}
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="text-center">
                            <span className="font-extrabold text-xs text-slate-900 block leading-tight">
                                {monthNames[viewMonth]} {viewYear}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                                {monthNamesEn[viewMonth]}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Days of week */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                        {daysOfWeek.map(d => (
                            <span key={d}>{d}</span>
                        ))}
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-1 text-xs">
                        {/* Empty padding days */}
                        {Array.from({ length: firstDayIndex }).map((_, i) => (
                            <div key={`empty-${i}`} />
                        ))}

                        {/* Days in Month */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const selected = isSelected(day);
                            const today = isToday(day);

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleSelectDay(day)}
                                    className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs transition cursor-pointer ${
                                        selected 
                                            ? 'bg-emerald-600 text-white shadow-xs' 
                                            : today 
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer Quick Select */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                            type="button"
                            onClick={handleQuickToday}
                            className="text-[11px] font-bold text-emerald-700 hover:underline"
                        >
                            આજની તારીખ (Today)
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-600"
                        >
                            બંધ કરો
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}
