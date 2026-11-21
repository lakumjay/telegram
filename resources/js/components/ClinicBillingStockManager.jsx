import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    IndianRupee, 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    Package, 
    AlertTriangle, 
    Receipt, 
    Plus, 
    Calendar, 
    Building2, 
    CheckCircle2, 
    X, 
    ShoppingBag, 
    Search,
    RefreshCw,
    Pill,
    ArrowUpRight,
    ArrowDownRight,
    FileSpreadsheet
} from 'lucide-react';

export default function ClinicBillingStockManager() {
    const [clinics, setClinics] = useState([]);
    const [activeClinicId, setActiveClinicId] = useState(1);
    const [summary, setSummary] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState('accounts'); // 'accounts', 'stock', 'billing'
    
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

    useEffect(() => {
        loadClinics();
    }, []);

    useEffect(() => {
        loadData();
    }, [activeClinicId]);

    const loadClinics = async () => {
        try {
            const res = await axios.get('/api/clinic-accounts/clinics');
            if (res.data?.success) {
                setClinics(res.data.clinics || []);
                if (res.data.clinics.length > 0 && !activeClinicId) {
                    setActiveClinicId(res.data.clinics[0].id);
                }
            }
        } catch (e) {
            console.error('Failed to load clinics:', e);
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [summaryRes, medsRes] = await Promise.all([
                axios.get(`/api/clinic-accounts/summary?clinic_id=${activeClinicId}`),
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

    const activeClinic = clinics.find(c => c.id === activeClinicId) || clinics[0];
    const today = summary?.today || {};
    const month = summary?.month || {};

    const filteredMedicines = medicines.filter(m => 
        m.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
        m.category.toLowerCase().includes(stockSearch.toLowerCase())
    );

    return (
        <div className="space-y-4 max-w-6xl mx-auto pb-12">
            
            {/* Top Multi-Clinic Switcher & Actions */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                                {activeClinic ? activeClinic.name : 'Clinic Accounts & Stock'}
                            </h2>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                ERP & Billing
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">
                            {activeClinic?.doctor_name} • {activeClinic?.city || 'Gujarat'} • કન્સલ્ટેશન ફી: ₹{activeClinic?.default_consultation_fee || '300'}
                        </p>
                    </div>
                </div>

                {/* Multi-Clinic Selector Dropdown */}
                <div className="flex flex-wrap items-center gap-2">
                    {clinics.length > 1 && (
                        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                            <span className="text-[11px] font-bold text-slate-500 pl-1.5">ક્લિનિક બદલો:</span>
                            <select
                                value={activeClinicId}
                                onChange={(e) => setActiveClinicId(Number(e.target.value))}
                                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                            >
                                {clinics.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Quick Action Buttons */}
                    <button
                        onClick={() => setIsBillModalOpen(true)}
                        className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Patient Bill</span>
                    </button>

                    <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Expense</span>
                    </button>

                    <button
                        onClick={() => setIsMedicineModalOpen(true)}
                        className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition cursor-pointer"
                    >
                        <Package className="w-3.5 h-3.5" />
                        <span>Add Medicine Stock</span>
                    </button>
                </div>
            </div>

            {/* Notification alert */}
            {message && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                    <span>{message}</span>
                    <button onClick={() => setMessage('')}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* 4 Financial Cards (Today Income, Today Expense, Net Profit, Low Stock) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Today Income */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                        <span className="font-semibold">આજની કુલ આવક</span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900">
                        ₹{Number(today.income || 0).toLocaleString()}
                    </div>
                    <p className="text-[11px] text-slate-400">
                        કુલ {today.patients_count || 0} દર્દીઓ આવ્યા
                    </p>
                </div>

                {/* 2. Today Expense */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                        <span className="font-semibold">આજનો ખર્ચ</span>
                        <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                            <ArrowDownRight className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-rose-600">
                        ₹{Number(today.expense || 0).toLocaleString()}
                    </div>
                    <p className="text-[11px] text-slate-400">
                        સ્ટાફ, ચા-નાસ્તો, લાઈટબિલ વગેરે
                    </p>
                </div>

                {/* 3. Today Net Profit */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                        <span className="font-semibold">આજનો ચોખ્ખો નફો</span>
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-blue-700">
                        ₹{Number(today.net_profit || 0).toLocaleString()}
                    </div>
                    <p className="text-[11px] text-slate-400">
                        આ મહિને કુલ: ₹{Number(month.net_profit || 0).toLocaleString()}
                    </p>
                </div>

                {/* 4. Low Stock Alert */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-xs">
                        <span className="font-semibold">દવાઓનો સ્ટોક</span>
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-700">
                        {summary?.low_stock_count || 0} દવા ઓછી છે
                    </div>
                    <p className="text-[11px] text-slate-400">
                        કુલ {medicines.length} દવાઓ રજિસ્ટર છે
                    </p>
                </div>
            </div>

            {/* Sub Tabs: Accounts vs Medicine Stock */}
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setActiveSubTab('accounts')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                        activeSubTab === 'accounts' 
                            ? 'bg-slate-900 text-white shadow-xs' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>આજના બિલ અને ખર્ચા (Daily Bills & Expenses)</span>
                </button>

                <button
                    onClick={() => setActiveSubTab('stock')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                        activeSubTab === 'stock' 
                            ? 'bg-slate-900 text-white shadow-xs' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <Package className="w-3.5 h-3.5 text-indigo-500" />
                    <span>મેડિસિન સ્ટોક & ઇન્વેન્ટરી (Medicine Stock)</span>
                </button>
            </div>

            {/* View 1: Accounts, Bills & Expenses */}
            {activeSubTab === 'accounts' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    
                    {/* Today Bills */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center space-x-1.5">
                                <Receipt className="w-4 h-4 text-emerald-600" />
                                <span>આજના પેશન્ટ બિલ ({today.bills?.length || 0})</span>
                            </h3>
                            <button
                                onClick={() => setIsBillModalOpen(true)}
                                className="text-xs text-emerald-700 font-bold hover:underline"
                            >
                                + નવું બિલ
                            </button>
                        </div>

                        {today.bills && today.bills.length > 0 ? (
                            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                                {today.bills.map(b => (
                                    <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                                        <div>
                                            <p className="font-bold text-slate-800">{b.patient_name}</p>
                                            <p className="text-[11px] text-slate-400">
                                                {b.bill_number} • {b.payment_method} {b.notes ? `• ${b.notes}` : ''}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-sm text-emerald-700">
                                                ₹{Number(b.total_amount).toLocaleString()}
                                            </span>
                                            <p className="text-[10px] text-slate-400">
                                                ફી: ₹{b.consultation_fee} {b.medicines_total > 0 ? `| દવા: ₹${b.medicines_total}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic py-6 text-center">
                                આજે હજી સુધી કોઈ બિલ બન્યું નથી.
                            </p>
                        )}
                    </div>

                    {/* Today Expenses */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center space-x-1.5">
                                <DollarSign className="w-4 h-4 text-rose-600" />
                                <span>આજના ખર્ચા ({today.expenses?.length || 0})</span>
                            </h3>
                            <button
                                onClick={() => setIsExpenseModalOpen(true)}
                                className="text-xs text-rose-700 font-bold hover:underline"
                            >
                                + ખર્ચ ઉમેરો
                            </button>
                        </div>

                        {today.expenses && today.expenses.length > 0 ? (
                            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                                {today.expenses.map(e => (
                                    <div key={e.id} className="py-2.5 flex items-center justify-between text-xs">
                                        <div>
                                            <p className="font-bold text-slate-800">{e.title}</p>
                                            <p className="text-[11px] text-slate-400">
                                                {e.category} • ચૂકવણી: {e.payment_mode}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-sm text-rose-600">
                                                ₹{Number(e.amount).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic py-6 text-center">
                                આજે કોઈ ખર્ચ નોંધાયેલ નથી.
                            </p>
                        )}
                    </div>

                </div>
            )}

            {/* View 2: Medicine Stock & Inventory */}
            {activeSubTab === 'stock' && (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={stockSearch}
                                onChange={(e) => setStockSearch(e.target.value)}
                                placeholder="દવાનું નામ અથવા કેટેગરી શોધો..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <button
                            onClick={() => setIsMedicineModalOpen(true)}
                            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex-shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>નવી દવા ઉમેરો</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs divide-y divide-slate-100">
                            <thead>
                                <tr className="text-slate-400 uppercase text-[10px] tracking-wider bg-slate-50">
                                    <th className="py-2.5 px-3">દવાનું નામ</th>
                                    <th className="py-2.5 px-3">કેટેગરી</th>
                                    <th className="py-2.5 px-3">ડોઝ</th>
                                    <th className="py-2.5 px-3">હાલનો સ્ટોક</th>
                                    <th className="py-2.5 px-3">ખરીદ ભાવ</th>
                                    <th className="py-2.5 px-3">વેચાણ ભાવ</th>
                                    <th className="py-2.5 px-3 text-right">સ્થિતિ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredMedicines.map(m => {
                                    const isLow = m.stock_quantity <= m.low_stock_alert;
                                    return (
                                        <tr key={m.id} className="hover:bg-slate-50/70 transition">
                                            <td className="py-2.5 px-3 font-bold text-slate-900">
                                                {m.name}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500">{m.category}</td>
                                            <td className="py-2.5 px-3 text-slate-500">{m.dosage || '-'}</td>
                                            <td className="py-2.5 px-3 font-bold">
                                                <span className={isLow ? 'text-rose-600' : 'text-slate-800'}>
                                                    {m.stock_quantity}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500">₹{m.unit_cost}</td>
                                            <td className="py-2.5 px-3 text-emerald-700 font-semibold">₹{m.selling_price}</td>
                                            <td className="py-2.5 px-3 text-right">
                                                {isLow ? (
                                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        ⚠️ સ્ટોક ઓછો છે
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        પૂરતો સ્ટોક
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal 1: New Patient OPD Bill */}
            {isBillModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="font-bold text-slate-900 text-sm">Create New Patient Bill (OPD)</h3>
                            <button onClick={() => setIsBillModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                        </div>

                        <form onSubmit={handleCreateBill} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">દર્દીનું નામ *</label>
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
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">કન્સલ્ટેશન ફી (₹)</label>
                                    <input
                                        type="number"
                                        value={billConsultation}
                                        onChange={(e) => setBillConsultation(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">દવાઓનું બિલ (₹)</label>
                                    <input
                                        type="number"
                                        value={billMedicinesTotal}
                                        onChange={(e) => setBillMedicinesTotal(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ડ્રેસિંગ / ઇન્જેક્શન (₹)</label>
                                    <input
                                        type="number"
                                        value={billProcedure}
                                        onChange={(e) => setBillProcedure(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">પેમેન્ટ પદ્ધતિ</label>
                                    <select
                                        value={billPaymentMethod}
                                        onChange={(e) => setBillPaymentMethod(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                                    >
                                        <option value="Cash">Cash (રોકડ)</option>
                                        <option value="UPI/GPay">GPay / UPI</option>
                                        <option value="Card">Card</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">નોંધ (Remarks)</label>
                                <input
                                    type="text"
                                    value={billNotes}
                                    onChange={(e) => setBillNotes(e.target.value)}
                                    placeholder="દા.ત. 3 દિવસની તાવની દવા"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                                >
                                    બિલ બનાવો અને આવકમાં ઉમેરો (₹{((Number(billConsultation) || 0) + (Number(billMedicinesTotal) || 0) + (Number(billProcedure) || 0))})
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: Add Clinic Expense */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="font-bold text-slate-900 text-sm">Add Clinic Expense</h3>
                            <button onClick={() => setIsExpenseModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                        </div>

                        <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">ખર્ચનું નામ / વિગત *</label>
                                <input
                                    type="text"
                                    required
                                    value={expenseTitle}
                                    onChange={(e) => setExpenseTitle(e.target.value)}
                                    placeholder="દા.ત. કમ્પાઉન્ડર પગાર, લાઈટ બિલ, ચા-પાણી"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-rose-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">રકમ (₹) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={expenseAmount}
                                        onChange={(e) => setExpenseAmount(e.target.value)}
                                        placeholder="500"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-rose-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">કેટેગરી</label>
                                    <select
                                        value={expenseCategory}
                                        onChange={(e) => setExpenseCategory(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                                    >
                                        <option value="Staff Salary">સ્ટાફ પગાર</option>
                                        <option value="Clinic Rent">ક્લિનિક ભાડું</option>
                                        <option value="Electricity">લાઈટ / પાણી બિલ</option>
                                        <option value="Tea/Snacks">ચા-નાસ્તો</option>
                                        <option value="Medical Supplies">મેડિકલ સાધન</option>
                                        <option value="Other">અન્ય ખર્ચ</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition"
                                >
                                    ખર્ચ સેવ કરો
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 3: Add Medicine Stock */}
            {isMedicineModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="font-bold text-slate-900 text-sm">Add / Update Medicine Stock</h3>
                            <button onClick={() => setIsMedicineModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
                        </div>

                        <form onSubmit={handleSaveMedicine} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">દવાનું નામ *</label>
                                <input
                                    type="text"
                                    required
                                    value={medName}
                                    onChange={(e) => setMedName(e.target.value)}
                                    placeholder="દા.ત. Paracetamol 650mg"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">કેટેગરી</label>
                                    <select
                                        value={medCategory}
                                        onChange={(e) => setMedCategory(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                                    >
                                        <option value="Tablet">Tablet (ટેબ્લેટ)</option>
                                        <option value="Syrup">Syrup (સીરપ)</option>
                                        <option value="Injection">Injection (ઇન્જેક્શન)</option>
                                        <option value="Ointment">Ointment (મલમ)</option>
                                        <option value="Surgical">Surgical (પાટો/રૂ)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">ડોઝ (Dosage)</label>
                                    <input
                                        type="text"
                                        value={medDosage}
                                        onChange={(e) => setMedDosage(e.target.value)}
                                        placeholder="650mg / 100ml"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">જથ્થો (Quantity) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={medQuantity}
                                        onChange={(e) => setMedQuantity(e.target.value)}
                                        placeholder="100"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">વેચાણ કિંમત (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={medPrice}
                                        onChange={(e) => setMedPrice(e.target.value)}
                                        placeholder="2.50"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
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
