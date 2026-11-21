import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CustomDatePicker from './CustomDatePicker';
import { 
    IndianRupee, 
    TrendingUp, 
    TrendingDown, 
    Package, 
    AlertTriangle, 
    Receipt, 
    Plus, 
    Calendar, 
    Building2, 
    X, 
    Search,
    RefreshCw,
    Pill,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

export default function ClinicBillingStockManager({ activeClinicId = 1 }) {
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    const [summary, setSummary] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState('accounts'); // 'accounts', 'stock'
    
    // Modals
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);

    // Bill Form
    const [billPatientName, setBillPatientName] = useState('');
    const [billConsultation, setBillConsultation] = useState('300');
    const [billMedicinesTotal, setBillMedicinesTotal] = useState('');
    const [billProcedure, setBillProcedure] = useState('');
    const [billDiscount, setBillDiscount] = useState('');
    const [billPaymentMethod, setBillPaymentMethod] = useState('Cash');
    const [billNotes, setBillNotes] = useState('');

    // Expense Form
    const [expenseTitle, setExpenseTitle] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('Staff Salary');
    const [expensePaymentMode, setExpensePaymentMode] = useState('Cash');

    // Medicine Stock Form
    const [medName, setMedName] = useState('');
    const [medCategory, setMedCategory] = useState('Tablet');
    const [medDosage, setMedDosage] = useState('');
    const [medQuantity, setMedQuantity] = useState('');
    const [medLowStockAlert, setMedLowStockAlert] = useState('20');
    const [medCost, setMedCost] = useState('');
    const [medPrice, setMedPrice] = useState('');

    const [stockSearch, setStockSearch] = useState('');
    const [message, setMessage] = useState('');

    // Reload financial summary automatically whenever selectedDate or activeClinicId changes
    useEffect(() => {
        loadData();
    }, [activeClinicId, selectedDate]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [summaryRes, medsRes] = await Promise.all([
                axios.get(`/api/clinic-accounts/summary?clinic_id=${activeClinicId}&date=${selectedDate}`),
                axios.get(`/api/clinic-accounts/medicines?clinic_id=${activeClinicId}`)
            ]);

            if (summaryRes.data?.success) setSummary(summaryRes.data);
            if (medsRes.data?.success) setMedicines(medsRes.data.medicines || []);
        } catch (e) {
            console.error('Failed to load clinic financial data:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateBill = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/clinic-accounts/bills', {
                clinic_id: activeClinicId,
                patient_name: billPatientName,
                consultation_fee: billConsultation,
                medicines_total: billMedicinesTotal || 0,
                procedure_fee: billProcedure || 0,
                discount: billDiscount || 0,
                payment_method: billPaymentMethod,
                bill_date: selectedDate, // Save with the currently selected date!
                notes: billNotes,
            });

            if (res.data?.success) {
                setMessage('✅ નવું બિલ બની ગયું અને આવકમાં ઉમેરાઈ ગયું!');
                setIsBillModalOpen(false);
                setBillPatientName('');
                setBillMedicinesTotal('');
                setBillProcedure('');
                setBillDiscount('');
                setBillNotes('');
                loadData();
            }
        } catch (e) {
            alert('Error creating bill: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleCreateExpense = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/clinic-accounts/expenses', {
                clinic_id: activeClinicId,
                title: expenseTitle,
                amount: expenseAmount,
                category: expenseCategory,
                payment_mode: expensePaymentMode,
                expense_date: selectedDate, // Save with the currently selected date!
            });

            if (res.data?.success) {
                setMessage('✅ ખર્ચ સફળતાપૂર્વક નોંધાઈ ગયો!');
                setIsExpenseModalOpen(false);
                setExpenseTitle('');
                setExpenseAmount('');
                loadData();
            }
        } catch (e) {
            alert('Error saving expense: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleSaveMedicine = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/clinic-accounts/medicines', {
                clinic_id: activeClinicId,
                name: medName,
                category: medCategory,
                dosage: medDosage,
                stock_quantity: medQuantity,
                low_stock_alert: medLowStockAlert,
                unit_cost: medCost || 0,
                selling_price: medPrice || 0,
            });

            if (res.data?.success) {
                setMessage('✅ દવાનો સ્ટોક અપડેટ થઈ ગયો!');
                setIsMedicineModalOpen(false);
                setMedName('');
                setMedDosage('');
                setMedQuantity('');
                setMedCost('');
                setMedPrice('');
                loadData();
            }
        } catch (e) {
            alert('Error saving medicine stock: ' + (e.response?.data?.message || e.message));
        }
    };

    const today = summary?.today || {};
    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    const filteredMedicines = medicines.filter(m => 
        m.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
        m.category.toLowerCase().includes(stockSearch.toLowerCase())
    );

    return (
        <div className="space-y-4 max-w-lg mx-auto pb-24 px-1 sm:px-0">
            
            {/* 1. Date Selector Bar (Custom Interactive Calendar with Gujarati Months) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-800 block leading-tight">તારીખ મુજબ હિસાબ</span>
                        <span className="text-[10px] text-slate-400 font-medium">Auto-fetched date accounts</span>
                    </div>
                </div>
                
                <div className="flex items-center space-x-2">
                    <CustomDatePicker
                        selectedDate={selectedDate}
                        onChange={(newDate) => setSelectedDate(newDate)}
                    />
                    {!isToday && (
                        <button
                            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                            className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1.5 rounded-xl border border-emerald-200 cursor-pointer"
                        >
                            આજે
                        </button>
                    )}
                </div>
            </div>

            {/* Notification alert */}
            {message && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                    <span>{message}</span>
                    <button onClick={() => setMessage('')}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* 2. Clean, Normal Financial Cards for Selected Date */}
            <div className="grid grid-cols-3 gap-2">
                {/* 1. Income */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">આવક (Income)</p>
                    <p className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                        ₹{Number(today.income || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400">{today.patients_count || 0} દર્દી</p>
                </div>

                {/* 2. Expense */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ખર્ચ (Expense)</p>
                    <p className="text-base sm:text-lg font-black text-rose-600 leading-tight">
                        ₹{Number(today.expense || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400">દૈનિક ખર્ચા</p>
                </div>

                {/* 3. Net Profit */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">નફો (Profit)</p>
                    <p className="text-base sm:text-lg font-black text-emerald-700 leading-tight">
                        ₹{Number(today.net_profit || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400">ચોખ્ખો નફો</p>
                </div>
            </div>

            {/* Sub Tabs: Bills vs Medicine Stock */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
                <button
                    onClick={() => setActiveSubTab('accounts')}
                    className={`flex-1 py-1.5 rounded-xl font-bold transition ${
                        activeSubTab === 'accounts' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                >
                    બિલ અને ખર્ચા
                </button>
                <button
                    onClick={() => setActiveSubTab('stock')}
                    className={`flex-1 py-1.5 rounded-xl font-bold transition flex items-center justify-center space-x-1 ${
                        activeSubTab === 'stock' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                >
                    <span>મેડિસિન સ્ટોક</span>
                    {summary?.low_stock_count > 0 && (
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    )}
                </button>
            </div>

            {/* View 1: Accounts, Bills & Expenses for Selected Date */}
            {activeSubTab === 'accounts' && (
                <div className="space-y-3">
                    
                    {/* Action Buttons to Add Bill or Expense */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setIsBillModalOpen(true)}
                            className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 shadow-2xs flex items-center justify-center space-x-2 text-xs font-bold text-emerald-700 transition active:scale-[0.98]"
                        >
                            <Plus className="w-4 h-4" />
                            <span>નવું બિલ બનાવો</span>
                        </button>

                        <button
                            onClick={() => setIsExpenseModalOpen(true)}
                            className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-rose-500 shadow-2xs flex items-center justify-center space-x-2 text-xs font-bold text-rose-700 transition active:scale-[0.98]"
                        >
                            <Plus className="w-4 h-4" />
                            <span>ખર્ચ ઉમેરો</span>
                        </button>
                    </div>

                    {/* Bills for Selected Date */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                            <span>આ તારીખના બિલ ({today.bills?.length || 0})</span>
                            <span className="text-[11px] text-emerald-700">કુલ: ₹{Number(today.income || 0).toLocaleString()}</span>
                        </div>

                        {today.bills && today.bills.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {today.bills.map(b => (
                                    <div key={b.id} className="py-2 flex items-center justify-between text-xs">
                                        <div>
                                            <p className="font-bold text-slate-800">{b.patient_name}</p>
                                            <p className="text-[10px] text-slate-400">
                                                {b.bill_number} • {b.payment_method}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-slate-900">₹{Number(b.total_amount).toLocaleString()}</span>
                                            <p className="text-[10px] text-slate-400">ફી: ₹{b.consultation_fee} {b.medicines_total > 0 ? `| દવા: ₹${b.medicines_total}` : ''}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic py-4 text-center">
                                આ તારીખે કોઈ બિલ નોંધાયેલ નથી.
                            </p>
                        )}
                    </div>

                    {/* Expenses for Selected Date */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                            <span>આ તારીખના ખર્ચા ({today.expenses?.length || 0})</span>
                            <span className="text-[11px] text-rose-600">કુલ: ₹{Number(today.expense || 0).toLocaleString()}</span>
                        </div>

                        {today.expenses && today.expenses.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {today.expenses.map(e => (
                                    <div key={e.id} className="py-2 flex items-center justify-between text-xs">
                                        <div>
                                            <p className="font-bold text-slate-800">{e.title}</p>
                                            <p className="text-[10px] text-slate-400">{e.category} • {e.payment_mode}</p>
                                        </div>
                                        <span className="font-bold text-rose-600">₹{Number(e.amount).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic py-4 text-center">
                                આ તારીખે કોઈ ખર્ચ નથી.
                            </p>
                        )}
                    </div>

                </div>
            )}

            {/* View 2: Medicine Stock */}
            {activeSubTab === 'stock' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={stockSearch}
                                onChange={(e) => setStockSearch(e.target.value)}
                                placeholder="દવાનું નામ શોધો..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={() => setIsMedicineModalOpen(true)}
                            className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex-shrink-0"
                        >
                            + દવા ઉમેરો
                        </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {filteredMedicines.map(m => {
                            const isLow = m.stock_quantity <= m.low_stock_alert;
                            return (
                                <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                                    <div>
                                        <p className="font-bold text-slate-800">{m.name} <span className="text-[10px] text-slate-400 font-normal">({m.dosage || m.category})</span></p>
                                        <p className="text-[10px] text-slate-400">કિંમત: ₹{m.selling_price}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                                            સ્ટોક: {m.stock_quantity}
                                        </span>
                                        {isLow && (
                                            <p className="text-[9px] text-rose-600 font-bold">⚠️ ઓછો સ્ટોક</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal: New Bill */}
            {isBillModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-4 shadow-xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">નવું દર્દી બિલ ({selectedDate})</h3>
                            <button onClick={() => setIsBillModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                        </div>

                        <form onSubmit={handleCreateBill} className="space-y-2.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">દર્દીનું નામ *</label>
                                <input
                                    type="text"
                                    required
                                    value={billPatientName}
                                    onChange={(e) => setBillPatientName(e.target.value)}
                                    placeholder="દા.ત. જય લાકુમ"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">કન્સલ્ટેશન ફી (₹)</label>
                                    <input
                                        type="number"
                                        value={billConsultation}
                                        onChange={(e) => setBillConsultation(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">દવાઓનું બિલ (₹)</label>
                                    <input
                                        type="number"
                                        value={billMedicinesTotal}
                                        onChange={(e) => setBillMedicinesTotal(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">પેમેન્ટ</label>
                                <select
                                    value={billPaymentMethod}
                                    onChange={(e) => setBillPaymentMethod(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                                >
                                    <option value="Cash">Cash (રોકડ)</option>
                                    <option value="UPI/GPay">GPay / UPI</option>
                                </select>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                                >
                                    બિલ સેવ કરો (₹{((Number(billConsultation) || 0) + (Number(billMedicinesTotal) || 0))})
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Expense */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-4 shadow-xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">ખર્ચ ઉમેરો ({selectedDate})</h3>
                            <button onClick={() => setIsExpenseModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                        </div>

                        <form onSubmit={handleCreateExpense} className="space-y-2.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">વિગત *</label>
                                <input
                                    type="text"
                                    required
                                    value={expenseTitle}
                                    onChange={(e) => setExpenseTitle(e.target.value)}
                                    placeholder="કમ્પાઉન્ડર પગાર, ચા-પાણી"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">રકમ (₹) *</label>
                                <input
                                    type="number"
                                    required
                                    value={expenseAmount}
                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                    placeholder="500"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
                                >
                                    ખર્ચ સેવ કરો
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Medicine Stock */}
            {isMedicineModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-4 shadow-xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-slate-900 text-xs sm:text-sm">દવાનો સ્ટોક ઉમેરો</h3>
                            <button onClick={() => setIsMedicineModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                        </div>

                        <form onSubmit={handleSaveMedicine} className="space-y-2.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">દવાનું નામ *</label>
                                <input
                                    type="text"
                                    required
                                    value={medName}
                                    onChange={(e) => setMedName(e.target.value)}
                                    placeholder="Paracetamol 650mg"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">જથ્થો (Qty) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={medQuantity}
                                        onChange={(e) => setMedQuantity(e.target.value)}
                                        placeholder="100"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">વેચાણ કિંમત (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={medPrice}
                                        onChange={(e) => setMedPrice(e.target.value)}
                                        placeholder="2.50"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                                >
                                    સ્ટોક સેવ કરો
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
