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
    ArrowDownRight,
    ArrowLeft,
    Printer,
    Edit2,
    Trash2,
    CheckCircle2,
    Clock,
    Phone,
    User,
    Check,
    FileText,
    Share2,
    AlertCircle
} from 'lucide-react';

export default function ClinicBillingStockManager({ 
    activeClinicId = 1, 
    initialSubTab = 'billing',
    onBack = null,
    refreshTrigger = 0
}) {
    const getLocalDateString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
    const [selectedMonth, setSelectedMonth] = useState(() => getLocalDateString().substring(0, 7));

    const [summary, setSummary] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState(initialSubTab); // 'billing', 'expenses', 'appointments', 'stock', 'reports'
    
    // Modals
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [editingBill, setEditingBill] = useState(null);

    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState(null);

    const [isMedicineModalOpen, setIsMedicineModalOpen] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState(null);

    // Bill Form State
    const [billPatientName, setBillPatientName] = useState('');
    const [billConsultation, setBillConsultation] = useState('300');
    const [billMedicinesTotal, setBillMedicinesTotal] = useState('');
    const [billProcedure, setBillProcedure] = useState('');
    const [billDiscount, setBillDiscount] = useState('');
    const [billPaymentMethod, setBillPaymentMethod] = useState('Cash');
    const [billPaymentStatus, setBillPaymentStatus] = useState('Paid');
    const [billNotes, setBillNotes] = useState('');
    const [isSavingBill, setIsSavingBill] = useState(false);

    // Expense Form State
    const [expenseTitle, setExpenseTitle] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('Staff Salary');
    const [expensePaymentMode, setExpensePaymentMode] = useState('Cash');
    const [expenseRemarks, setExpenseRemarks] = useState('');
    const [isSavingExpense, setIsSavingExpense] = useState(false);

    // Appointment Form State
    const [apptPatientName, setApptPatientName] = useState('');
    const [apptPhone, setApptPhone] = useState('');
    const [apptTime, setApptTime] = useState('10:30 AM');
    const [apptReason, setApptReason] = useState('સામાન્ય તપાસ (General Checkup)');
    const [apptStatus, setApptStatus] = useState('Confirmed');
    const [apptNotes, setApptNotes] = useState('');
    const [isSavingAppt, setIsSavingAppt] = useState(false);

    // Medicine Stock Form State
    const [medName, setMedName] = useState('');
    const [medCategory, setMedCategory] = useState('Tablet');
    const [medDosage, setMedDosage] = useState('');
    const [medQuantity, setMedQuantity] = useState('');
    const [medLowStockAlert, setMedLowStockAlert] = useState('20');
    const [medCost, setMedCost] = useState('');
    const [medPrice, setMedPrice] = useState('');
    const [isSavingMed, setIsSavingMed] = useState(false);

    const [stockSearch, setStockSearch] = useState('');
    const [message, setMessage] = useState('');
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (initialSubTab) {
            setActiveSubTab(initialSubTab);
        }
    }, [initialSubTab]);

    // Reload financial summary & lists automatically whenever selectedDate, selectedMonth, activeClinicId, or refreshTrigger changes
    useEffect(() => {
        loadData();
    }, [activeClinicId, selectedDate, selectedMonth, refreshTrigger]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [summaryRes, medsRes, apptsRes] = await Promise.all([
                axios.get(`/api/clinic-accounts/summary?clinic_id=${activeClinicId}&date=${selectedDate}&month=${selectedMonth}`),
                axios.get(`/api/clinic-accounts/medicines?clinic_id=${activeClinicId}`),
                axios.get(`/api/clinic-accounts/appointments?clinic_id=${activeClinicId}&date=${selectedDate}`)
            ]);

            if (summaryRes.data?.success) setSummary(summaryRes.data);
            if (medsRes.data?.success) setMedicines(medsRes.data.medicines || []);
            if (apptsRes.data?.success) setAppointments(apptsRes.data.appointments || []);
        } catch (e) {
            console.error('Failed to load clinic financial data:', e);
        } finally {
            setIsLoading(false);
        }
    };

    // ---------------- BILL CRUD ----------------
    const handleOpenCreateBill = () => {
        setEditingBill(null);
        setBillPatientName('');
        setBillConsultation('300');
        setBillMedicinesTotal('');
        setBillProcedure('');
        setBillDiscount('');
        setBillPaymentMethod('Cash');
        setBillPaymentStatus('Paid');
        setBillNotes('');
        setFormError('');
        setIsBillModalOpen(true);
    };

    const handleOpenEditBill = (b) => {
        setEditingBill(b);
        setBillPatientName(b.patient_name || '');
        setBillConsultation(b.consultation_fee || '0');
        setBillMedicinesTotal(b.medicines_total || '');
        setBillProcedure(b.procedure_fee || '');
        setBillDiscount(b.discount || '');
        setBillPaymentMethod(b.payment_method || 'Cash');
        setBillPaymentStatus(b.payment_status || 'Paid');
        setBillNotes(b.notes || '');
        setFormError('');
        setIsBillModalOpen(true);
    };

    const handleSaveBill = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!billPatientName.trim()) {
            setFormError('દર્દીનું નામ દાખલ કરવું ફરજિયાત છે.');
            return;
        }

        setIsSavingBill(true);
        try {
            if (editingBill) {
                // Update
                const res = await axios.post(`/api/clinic-accounts/bills/${editingBill.id}`, {
                    patient_name: billPatientName.trim(),
                    consultation_fee: billConsultation,
                    medicines_total: billMedicinesTotal || 0,
                    procedure_fee: billProcedure || 0,
                    discount: billDiscount || 0,
                    payment_method: billPaymentMethod,
                    payment_status: billPaymentStatus,
                    bill_date: selectedDate,
                    notes: billNotes,
                });
                if (res.data?.success) {
                    if (window.showAppToast) window.showAppToast('✅ બિલ સફળતાપૂર્વક અપડેટ થઈ ગયું!');
                }
            } else {
                // Create
                const res = await axios.post('/api/clinic-accounts/bills', {
                    clinic_id: activeClinicId,
                    patient_name: billPatientName.trim(),
                    consultation_fee: billConsultation,
                    medicines_total: billMedicinesTotal || 0,
                    procedure_fee: billProcedure || 0,
                    discount: billDiscount || 0,
                    payment_method: billPaymentMethod,
                    bill_date: selectedDate,
                    notes: billNotes,
                });
                if (res.data?.success) {
                    if (window.showAppToast) window.showAppToast('✅ નવું બિલ સફળતાપૂર્વક બની ગયું!');
                }
            }

            setIsBillModalOpen(false);
            if (window.triggerAppRefresh) window.triggerAppRefresh();
            loadData();
        } catch (e) {
            setFormError(e.response?.data?.message || 'બિલ સેવ કરવામાં ક્ષતિ આવી.');
        } finally {
            setIsSavingBill(false);
        }
    };

    const handleDeleteBill = async (billId) => {
        if (!confirm('શું તમે ખરેખર આ બિલ ડિલીટ કરવા માંગો છો?')) return;
        try {
            const res = await axios.delete(`/api/clinic-accounts/bills/${billId}`);
            if (res.data?.success) {
                if (window.showAppToast) window.showAppToast('🗑️ બિલ ડિલીટ થઈ ગયું.');
                if (window.triggerAppRefresh) window.triggerAppRefresh();
                loadData();
            }
        } catch (e) {
            alert('બિલ ડિલીટ કરવામાં ક્ષતિ આવી.');
        }
    };

    // ---------------- EXPENSE CRUD ----------------
    const handleOpenCreateExpense = () => {
        setEditingExpense(null);
        setExpenseTitle('');
        setExpenseAmount('');
        setExpenseCategory('Staff Salary');
        setExpensePaymentMode('Cash');
        setExpenseRemarks('');
        setFormError('');
        setIsExpenseModalOpen(true);
    };

    const handleOpenEditExpense = (exp) => {
        setEditingExpense(exp);
        setExpenseTitle(exp.title || '');
        setExpenseAmount(exp.amount || '');
        setExpenseCategory(exp.category || 'Staff Salary');
        setExpensePaymentMode(exp.payment_mode || 'Cash');
        setExpenseRemarks(exp.remarks || '');
        setFormError('');
        setIsExpenseModalOpen(true);
    };

    const handleSaveExpense = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!expenseTitle.trim()) {
            setFormError('ખર્ચનું શીર્ષક દાખલ કરો.');
            return;
        }
        if (!expenseAmount || Number(expenseAmount) <= 0) {
            setFormError('માન્ય રકમ દાખલ કરો.');
            return;
        }

        setIsSavingExpense(true);
        try {
            if (editingExpense) {
                // Update
                const res = await axios.post(`/api/clinic-accounts/expenses/${editingExpense.id}`, {
                    title: expenseTitle.trim(),
                    amount: expenseAmount,
                    category: expenseCategory,
                    payment_mode: expensePaymentMode,
                    expense_date: selectedDate,
                    remarks: expenseRemarks,
                });
                if (res.data?.success) {
                    if (window.showAppToast) window.showAppToast('✅ ખર્ચ સફળતાપૂર્વક અપડેટ થઈ ગયો!');
                }
            } else {
                // Create
                const res = await axios.post('/api/clinic-accounts/expenses', {
                    clinic_id: activeClinicId,
                    title: expenseTitle.trim(),
                    amount: expenseAmount,
                    category: expenseCategory,
                    payment_mode: expensePaymentMode,
                    expense_date: selectedDate,
                    remarks: expenseRemarks,
                });
                if (res.data?.success) {
                    if (window.showAppToast) window.showAppToast('✅ ખર્ચ સફળતાપૂર્વક નોંધાઈ ગયો!');
                }
            }

            setIsExpenseModalOpen(false);
            if (window.triggerAppRefresh) window.triggerAppRefresh();
            loadData();
        } catch (e) {
            setFormError(e.response?.data?.message || 'ખર્ચ સેવ કરવામાં ક્ષતિ આવી.');
        } finally {
            setIsSavingExpense(false);
        }
    };

    const handleDeleteExpense = async (expId) => {
        if (!confirm('શું તમે ખરેખર આ ખર્ચ ડિલીટ કરવા માંગો છો?')) return;
        try {
            const res = await axios.delete(`/api/clinic-accounts/expenses/${expId}`);
            if (res.data?.success) {
                if (window.showAppToast) window.showAppToast('🗑️ ખર્ચ ડિલીટ થઈ ગયો.');
                if (window.triggerAppRefresh) window.triggerAppRefresh();
                loadData();
            }
        } catch (e) {
            alert('ખર્ચ ડિલીટ કરવામાં ક્ષતિ આવી.');
        }
    };

    // ---------------- APPOINTMENT CRUD ----------------
    const handleOpenCreateAppt = () => {
        setEditingAppointment(null);
        setApptPatientName('');
        setApptPhone('');
        setApptTime('10:30 AM');
        setApptReason('સામાન્ય તપાસ (General Checkup)');
        setApptStatus('Confirmed');
        setApptNotes('');
        setFormError('');
        setIsAppointmentModalOpen(true);
    };

    const handleOpenEditAppt = (appt) => {
        setEditingAppointment(appt);
        setApptPatientName(appt.patient_name || '');
        setApptPhone(appt.phone || '');
        setApptTime(appt.appointment_time || '10:30 AM');
        setApptReason(appt.reason || 'સામાન્ય તપાસ (General Checkup)');
        setApptStatus(appt.status || 'Confirmed');
        setApptNotes(appt.notes || '');
        setFormError('');
        setIsAppointmentModalOpen(true);
    };

    const handleSaveAppointment = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!apptPatientName.trim()) {
            setFormError('દર્દીનું નામ દાખલ કરો.');
            return;
        }

        if (apptPhone.trim() && apptPhone.trim().length !== 10) {
            setFormError('કૃપા કરીને ૧૦ અંકનો સાચો મોબાઈલ નંબર દાખલ કરો.');
            return;
        }

        setIsSavingAppt(true);
        try {
            if (editingAppointment) {
                // Update
                const res = await axios.post(`/api/clinic-accounts/appointments/${editingAppointment.id}`, {
                    patient_name: apptPatientName.trim(),
                    phone: apptPhone.trim() || null,
                    appointment_date: selectedDate,
                    appointment_time: apptTime,
                    reason: apptReason,
                    status: apptStatus,
                    notes: apptNotes,
                });
                if (res.data?.success) {
                    if (window.showAppToast) window.showAppToast('✅ એપોઇન્ટમેન્ટ અપડેટ થઈ ગઈ!');
                }
            } else {
                // Create
                const res = await axios.post('/api/clinic-accounts/appointments', {
                    clinic_id: activeClinicId,
                    patient_name: apptPatientName.trim(),
                    phone: apptPhone.trim() || null,
                    appointment_date: selectedDate,
                    appointment_time: apptTime,
                    reason: apptReason,
                    notes: apptNotes,
                });
                if (res.data?.success) {
                    if (window.showAppToast) window.showAppToast('✅ એપોઇન્ટમેન્ટ સફળતાપૂર્વક બુક થઈ ગઈ!');
                }
            }

            setIsAppointmentModalOpen(false);
            if (window.triggerAppRefresh) window.triggerAppRefresh();
            loadData();
        } catch (e) {
            setFormError(e.response?.data?.message || 'એપોઇન્ટમેન્ટ સેવ કરવામાં ક્ષતિ આવી.');
        } finally {
            setIsSavingAppt(false);
        }
    };

    const handleToggleApptStatus = async (appt, newStatus) => {
        try {
            const res = await axios.post(`/api/clinic-accounts/appointments/${appt.id}`, {
                status: newStatus
            });
            if (res.data?.success) {
                if (window.showAppToast) window.showAppToast(`✅ સ્ટેટસ અપડેટ: ${newStatus}`);
                if (window.triggerAppRefresh) window.triggerAppRefresh();
                loadData();
            }
        } catch(e) {}
    };

    const handleDeleteAppointment = async (apptId) => {
        if (!confirm('શું તમે આ એપોઇન્ટમેન્ટ ડિલીટ કરવા માંગો છો?')) return;
        try {
            const res = await axios.delete(`/api/clinic-accounts/appointments/${apptId}`);
            if (res.data?.success) {
                if (window.showAppToast) window.showAppToast('🗑️ એપોઇન્ટમેન્ટ ડિલીટ થઈ ગઈ.');
                if (window.triggerAppRefresh) window.triggerAppRefresh();
                loadData();
            }
        } catch (e) {
            alert('એપોઇન્ટમેન્ટ ડિલીટ કરવામાં ક્ષતિ આવી.');
        }
    };

    // ---------------- MEDICINE CRUD ----------------
    const handleOpenCreateMed = () => {
        setEditingMedicine(null);
        setMedName('');
        setMedCategory('Tablet');
        setMedDosage('');
        setMedQuantity('');
        setMedLowStockAlert('20');
        setMedCost('');
        setMedPrice('');
        setFormError('');
        setIsMedicineModalOpen(true);
    };

    const handleOpenEditMed = (m) => {
        setEditingMedicine(m);
        setMedName(m.name || '');
        setMedCategory(m.category || 'Tablet');
        setMedDosage(m.dosage || '');
        setMedQuantity(m.stock_quantity || '0');
        setMedLowStockAlert(m.low_stock_alert || '20');
        setMedCost(m.unit_cost || '');
        setMedPrice(m.selling_price || '');
        setFormError('');
        setIsMedicineModalOpen(true);
    };

    const handleSaveMedicine = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!medName.trim()) {
            setFormError('દવાનું નામ દાખલ કરો.');
            return;
        }

        setIsSavingMed(true);
        try {
            if (editingMedicine) {
                const res = await axios.post(`/api/clinic-accounts/medicines/${editingMedicine.id}`, {
                    name: medName.trim(),
                    category: medCategory,
                    dosage: medDosage,
                    stock_quantity: parseInt(medQuantity) || 0,
                    low_stock_alert: parseInt(medLowStockAlert) || 20,
                    unit_cost: medCost || 0,
                    selling_price: medPrice || 0,
                });
                if (res.data?.success) {
                    if (window.showAppToast) window.showAppToast('✅ દવાની વિગતો અપડેટ થઈ ગઈ!');
                }
            } else {
                const res = await axios.post('/api/clinic-accounts/medicines', {
                    clinic_id: activeClinicId,
                    name: medName.trim(),
                    category: medCategory,
                    dosage: medDosage,
                    stock_quantity: parseInt(medQuantity) || 0,
                    low_stock_alert: parseInt(medLowStockAlert) || 20,
                    unit_cost: medCost || 0,
                    selling_price: medPrice || 0,
                });
                if (res.data?.success) {
                    if (window.showAppToast) window.showAppToast('✅ નવી દવા સ્ટોકમાં ઉમેરાઈ ગઈ!');
                }
            }

            setIsMedicineModalOpen(false);
            if (window.triggerAppRefresh) window.triggerAppRefresh();
            loadData();
        } catch (e) {
            setFormError(e.response?.data?.message || 'દવા સેવ કરવામાં ક્ષતિ આવી.');
        } finally {
            setIsSavingMed(false);
        }
    };

    const handleQuickStockChange = async (med, delta) => {
        const newQty = Math.max(0, (med.stock_quantity || 0) + delta);
        try {
            const res = await axios.post(`/api/clinic-accounts/medicines/${med.id}`, {
                stock_quantity: newQty
            });
            if (res.data?.success) {
                if (window.showAppToast) window.showAppToast(`✅ સ્ટોક: ${newQty}`);
                if (window.triggerAppRefresh) window.triggerAppRefresh();
                loadData();
            }
        } catch(e) {}
    };

    const handleDeleteMedicine = async (medId) => {
        if (!confirm('શું તમે આ દવા સ્ટોકમાંથી ડિલીટ કરવા માંગો છો?')) return;
        try {
            const res = await axios.delete(`/api/clinic-accounts/medicines/${medId}`);
            if (res.data?.success) {
                if (window.showAppToast) window.showAppToast('🗑️ દવા ડિલીટ થઈ ગઈ.');
                if (window.triggerAppRefresh) window.triggerAppRefresh();
                loadData();
            }
        } catch(e) {
            alert('દવા ડિલીટ કરવામાં ક્ષતિ આવી.');
        }
    };

    const today = summary?.today || {};
    const month = summary?.month || {};
    const isToday = selectedDate === getLocalDateString();

    const filteredMedicines = medicines.filter(m => 
        m.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
        (m.category && m.category.toLowerCase().includes(stockSearch.toLowerCase()))
    );

    return (
        <div className="space-y-4 max-w-2xl mx-auto pb-24 px-1 sm:px-0">
            
            {/* 1. Header with Back Button */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="w-9 h-9 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <div>
                        <h2 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                            Clinic Accounts & Billing
                        </h2>
                        <p className="text-[11px] text-slate-400 font-medium">
                            બિલિંગ, દૈનિક ખર્ચા, એપોઇન્ટમેન્ટ્સ અને સ્ટોક
                        </p>
                    </div>
                </div>

                <button
                    onClick={loadData}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                    title="Refresh Data"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* 2. Interactive Date Selector Bar with Gujarati Month Calendar */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-slate-800 block leading-tight">તારીખ મુજબ હિસાબ</span>
                        <span className="text-[10px] text-slate-400 font-medium">{selectedDate}</span>
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

            {/* 3. Financial Metrics Cards for Selected Date */}
            <div className="grid grid-cols-3 gap-2">
                {/* Income */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">આવક (Income)</p>
                    <p className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                        ₹{Number(today.income || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400">{today.patients_count || 0} બિલ</p>
                </div>

                {/* Expense */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ખર્ચ (Expense)</p>
                    <p className="text-base sm:text-lg font-black text-rose-600 leading-tight">
                        ₹{Number(today.expense || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400">{today.expenses?.length || 0} એન્ટ્રી</p>
                </div>

                {/* Net Profit */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">નફો (Profit)</p>
                    <p className="text-base sm:text-lg font-black text-emerald-700 leading-tight">
                        ₹{Number(today.net_profit || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400">ચોખ્ખો નફો</p>
                </div>
            </div>

            {/* 4. Sub-Navigation Tabs */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs overflow-x-auto scrollbar-none">
                <button
                    onClick={() => setActiveSubTab('billing')}
                    className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-xl font-bold transition text-center cursor-pointer ${
                        activeSubTab === 'billing' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    બિલિંગ
                </button>
                <button
                    onClick={() => setActiveSubTab('expenses')}
                    className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-xl font-bold transition text-center cursor-pointer ${
                        activeSubTab === 'expenses' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    ખર્ચા
                </button>
                <button
                    onClick={() => setActiveSubTab('appointments')}
                    className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-xl font-bold transition text-center cursor-pointer ${
                        activeSubTab === 'appointments' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    એપોઇન્ટમેન્ટ્સ ({appointments.length})
                </button>
                <button
                    onClick={() => setActiveSubTab('stock')}
                    className={`flex-1 min-w-[85px] py-1.5 px-2 rounded-xl font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                        activeSubTab === 'stock' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <span>મેડિસિન સ્ટોક</span>
                    {summary?.low_stock_count > 0 && (
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    )}
                </button>
                <button
                    onClick={() => setActiveSubTab('reports')}
                    className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-xl font-bold transition text-center cursor-pointer ${
                        activeSubTab === 'reports' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    રિપોર્ટ
                </button>
            </div>

            {/* ================= VIEW 1: BILLING ================= */}
            {activeSubTab === 'billing' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">આ તારીખના બિલ ({today.bills?.length || 0})</span>
                        <button
                            onClick={handleOpenCreateBill}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs transition active:scale-95 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>નવું બિલ</span>
                        </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2">
                        {today.bills && today.bills.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {today.bills.map(b => (
                                    <div key={b.id} className="py-2.5 flex items-center justify-between text-xs group">
                                        <div className="space-y-0.5">
                                            <p className="font-extrabold text-slate-900">{b.patient_name}</p>
                                            <p className="text-[10px] text-slate-400">
                                                {b.bill_number} • {b.payment_method} • <span className="font-bold text-emerald-700">{b.payment_status}</span>
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                કન્સલ્ટેશન: ₹{b.consultation_fee} {b.medicines_total > 0 ? `| દવા: ₹${b.medicines_total}` : ''}
                                            </p>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <span className="font-black text-sm text-slate-900">₹{Number(b.total_amount).toLocaleString('en-IN')}</span>
                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={() => handleOpenEditBill(b)}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                                                    title="Edit Bill"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteBill(b.id)}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                                    title="Delete Bill"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center space-y-2 text-slate-400">
                                <Receipt className="w-7 h-7 mx-auto text-slate-300" />
                                <p className="text-xs font-bold">આ તારીખે કોઈ બિલ નોંધાયેલ નથી.</p>
                                <button
                                    onClick={handleOpenCreateBill}
                                    className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] font-bold"
                                >
                                    + પ્રથમ બિલ બનાવો
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================= VIEW 2: EXPENSES ================= */}
            {activeSubTab === 'expenses' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">આ તારીખના ખર્ચા ({today.expenses?.length || 0})</span>
                        <button
                            onClick={handleOpenCreateExpense}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs transition active:scale-95 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>ખર્ચ ઉમેરો</span>
                        </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2">
                        {today.expenses && today.expenses.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {today.expenses.map(e => (
                                    <div key={e.id} className="py-2.5 flex items-center justify-between text-xs group">
                                        <div className="space-y-0.5">
                                            <p className="font-extrabold text-slate-900">{e.title}</p>
                                            <p className="text-[10px] text-slate-400">{e.category} • {e.payment_mode}</p>
                                            {e.remarks && <p className="text-[10px] text-slate-400 italic">{e.remarks}</p>}
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <span className="font-black text-sm text-rose-600">₹{Number(e.amount).toLocaleString('en-IN')}</span>
                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={() => handleOpenEditExpense(e)}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                                                    title="Edit Expense"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteExpense(e.id)}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                                    title="Delete Expense"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center space-y-2 text-slate-400">
                                <Receipt className="w-7 h-7 mx-auto text-slate-300" />
                                <p className="text-xs font-bold">આ તારીખે કોઈ ખર્ચ નથી.</p>
                                <button
                                    onClick={handleOpenCreateExpense}
                                    className="px-3 py-1 bg-rose-50 text-rose-700 rounded-xl text-[11px] font-bold"
                                >
                                    + ખર્ચ ઉમેરો
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================= VIEW 3: APPOINTMENTS ================= */}
            {activeSubTab === 'appointments' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">આ તારીખની એપોઇન્ટમેન્ટ્સ ({appointments.length})</span>
                        <button
                            onClick={handleOpenCreateAppt}
                            className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs transition active:scale-95 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>એપોઇન્ટમેન્ટ બુક કરો</span>
                        </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2">
                        {appointments.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {appointments.map(a => (
                                    <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center space-x-2">
                                                <p className="font-extrabold text-slate-900">{a.patient_name}</p>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    a.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                                                    a.status === 'Cancelled' ? 'bg-rose-50 text-rose-600' :
                                                    'bg-blue-50 text-blue-700'
                                                }`}>
                                                    {a.status}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400">
                                                ⏰ {a.appointment_time} {a.phone ? `• 📞 ${a.phone}` : ''} • {a.reason}
                                            </p>
                                        </div>

                                        <div className="flex items-center space-x-1.5">
                                            {a.status !== 'Completed' && (
                                                <button
                                                    onClick={() => handleToggleApptStatus(a, 'Completed')}
                                                    className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] transition cursor-pointer"
                                                >
                                                    પૂર્ણ (Done)
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleOpenEditAppt(a)}
                                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAppointment(a.id)}
                                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center space-y-2 text-slate-400">
                                <Calendar className="w-7 h-7 mx-auto text-slate-300" />
                                <p className="text-xs font-bold">આ તારીખે કોઈ એપોઇન્ટમેન્ટ નથી.</p>
                                <button
                                    onClick={handleOpenCreateAppt}
                                    className="px-3 py-1 bg-violet-50 text-violet-700 rounded-xl text-[11px] font-bold"
                                >
                                    + એપોઇન્ટમેન્ટ બુક કરો
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================= VIEW 4: MEDICINE STOCK ================= */}
            {activeSubTab === 'stock' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={stockSearch}
                                onChange={(e) => setStockSearch(e.target.value)}
                                placeholder="દવા અથવા કેટેગરી શોધો..."
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                            />
                        </div>

                        <button
                            onClick={handleOpenCreateMed}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs transition active:scale-95 cursor-pointer flex-shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>નવી દવા</span>
                        </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2">
                        {filteredMedicines.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {filteredMedicines.map(m => {
                                    const isLow = m.stock_quantity <= (m.low_stock_alert || 20);
                                    return (
                                        <div key={m.id} className="py-2.5 flex items-center justify-between text-xs">
                                            <div className="space-y-0.5">
                                                <div className="flex items-center space-x-2">
                                                    <p className="font-extrabold text-slate-900">{m.name}</p>
                                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                                        {m.category || 'Tablet'}
                                                    </span>
                                                    {isLow && (
                                                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
                                                            Low Stock
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-400">
                                                    ડોઝ: {m.dosage || 'N/A'} • વેચાણ ભાવ: ₹{m.selling_price || 0}
                                                </p>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl px-1.5 py-0.5">
                                                    <button
                                                        onClick={() => handleQuickStockChange(m, -10)}
                                                        className="w-5 h-5 flex items-center justify-center font-bold text-slate-500 hover:text-rose-600"
                                                    >
                                                        -
                                                    </button>
                                                    <span className={`font-black text-xs px-1 ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                                                        {m.stock_quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => handleQuickStockChange(m, 10)}
                                                        className="w-5 h-5 flex items-center justify-center font-bold text-slate-500 hover:text-emerald-700"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => handleOpenEditMed(m)}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMedicine(m.id)}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center space-y-2 text-slate-400">
                                <Pill className="w-7 h-7 mx-auto text-slate-300" />
                                <p className="text-xs font-bold">કોઈ દવા મળી નથી.</p>
                                <button
                                    onClick={handleOpenCreateMed}
                                    className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] font-bold"
                                >
                                    + સ્ટોકમાં દવા ઉમેરો
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================= VIEW 5: REPORTS ================= */}
            {activeSubTab === 'reports' && (
                <div className="space-y-4">
                    {/* Month Filter Selector */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="font-extrabold text-sm text-slate-800">
                                    માસિક & સાપ્તાહિક રિપોર્ટ (Month & Week Analytics)
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    મહિના મુજબ આવક, ખર્ચ, નફો અને દર્દીઓની વિગતવાર યાદી
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-600" /> મહિનો પસંદ કરો:
                                </label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                                >
                                    {(summary?.available_months && summary.available_months.length > 0
                                        ? summary.available_months
                                        : [selectedMonth]
                                    ).map((m) => {
                                        const [yr, mo] = m.split('-');
                                        const monthNames = [
                                            'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
                                            'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
                                        ];
                                        const gujMonth = monthNames[parseInt(mo, 10) - 1] || mo;
                                        return (
                                            <option key={m} value={m}>
                                                {gujMonth} {yr} ({m})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        {/* Selected Month KPI Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                                <p className="text-[11px] font-bold text-emerald-700">કુલ દર્દીઓ ({selectedMonth})</p>
                                <p className="text-xl font-black text-emerald-900">{month.patients_count || 0}</p>
                                <p className="text-[10px] text-emerald-600 font-medium">દર્દી તપાસણી</p>
                            </div>

                            <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                                <p className="text-[11px] font-bold text-blue-700">કુલ આવક</p>
                                <p className="text-xl font-black text-blue-900">₹{Number(month.income || 0).toLocaleString('en-IN')}</p>
                                <p className="text-[10px] text-blue-600 font-medium">કન્સલ્ટેશન + દવા</p>
                            </div>

                            <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-1">
                                <p className="text-[11px] font-bold text-rose-700">કુલ ખર્ચ</p>
                                <p className="text-xl font-black text-rose-800">₹{Number(month.expense || 0).toLocaleString('en-IN')}</p>
                                <p className="text-[10px] text-rose-600 font-medium">ક્લિનિક ખર્ચ</p>
                            </div>

                            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-1">
                                <p className="text-[11px] font-bold text-amber-700">ચોખ્ખો નફો (Net Profit)</p>
                                <p className={`text-xl font-black ${(month.net_profit || 0) >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                                    ₹{Number(month.net_profit || 0).toLocaleString('en-IN')}
                                </p>
                                <p className="text-[10px] text-amber-600 font-medium">આવક - ખર્ચ</p>
                            </div>
                        </div>
                    </div>

                    {/* Week-wise Breakdown Table / Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div>
                                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                                    સાપ્તાહિક વિગતવાર રિપોર્ટ (Week-wise Breakdown)
                                </h4>
                                <p className="text-[11px] text-slate-400">
                                    પસંદ કરેલ મહિનાનું અઠવાડિયા વાઇઝ વિશ્લેષણ
                                </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                                {selectedMonth}
                            </span>
                        </div>

                        {summary?.week_breakdown && summary.week_breakdown.length > 0 ? (
                            <div className="space-y-2.5">
                                {summary.week_breakdown.map((w) => (
                                    <div
                                        key={w.week}
                                        className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                    >
                                        <div className="space-y-0.5">
                                            <div className="flex items-center space-x-2">
                                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                                                    {w.week}
                                                </span>
                                                <span className="font-extrabold text-xs text-slate-800">
                                                    {w.label}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 pl-7">
                                                તારીખ: {w.start} થી {w.end} • દર્દીઓ: <strong className="text-slate-700">{w.patients_count}</strong>
                                            </p>
                                        </div>

                                        <div className="flex items-center space-x-3 text-right self-end sm:self-auto pl-7 sm:pl-0">
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-bold">આવક</span>
                                                <span className="text-xs font-black text-emerald-700">
                                                    ₹{Number(w.income || 0).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-bold">ખર્ચ</span>
                                                <span className="text-xs font-black text-rose-600">
                                                    ₹{Number(w.expense || 0).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                            <div className="min-w-[70px]">
                                                <span className="text-[10px] text-slate-400 block font-bold">નફો</span>
                                                <span className={`text-xs font-black ${(w.net_profit || 0) >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                                                    ₹{Number(w.net_profit || 0).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 text-center py-4">આ મહિનાનો કોઈ રેકોર્ડ મળ્યો નથી.</p>
                        )}
                    </div>

                    {/* Today's Quick Snapshot */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2">
                        <h4 className="font-extrabold text-xs text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
                            આજનો દૈનિક સારાંશ (Today's Snapshot - {selectedDate})
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-[11px] font-bold text-slate-400">આજની કુલ આવક</p>
                                <p className="text-lg font-black text-slate-900">₹{Number(today.income || 0).toLocaleString('en-IN')}</p>
                                <p className="text-[10px] text-slate-400">{today.patients_count || 0} દર્દીઓ</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-[11px] font-bold text-slate-400">આજનો કુલ ખર્ચ</p>
                                <p className="text-lg font-black text-rose-600">₹{Number(today.expense || 0).toLocaleString('en-IN')}</p>
                                <p className="text-[10px] text-slate-400">{today.expenses?.length || 0} ખર્ચ એન્ટ્રી</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL 1: BILL CREATE / EDIT ================= */}
            {isBillModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-3 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="font-extrabold text-sm text-slate-900">
                                {editingBill ? 'બિલમાં સુધારો (Edit Bill)' : 'નવું બિલ બનાવો (New Bill)'}
                            </h3>
                            <button onClick={() => setIsBillModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {formError && (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs flex items-center space-x-1.5">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSaveBill} className="space-y-2.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">દર્દીનું નામ *</label>
                                <input
                                    type="text"
                                    required
                                    value={billPatientName}
                                    onChange={(e) => setBillPatientName(e.target.value)}
                                    placeholder="દર્દીનું નામ"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">કન્સલ્ટેશન ફી</label>
                                    <input
                                        type="number"
                                        value={billConsultation}
                                        onChange={(e) => setBillConsultation(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">દવા ચાર્જ</label>
                                    <input
                                        type="number"
                                        value={billMedicinesTotal}
                                        onChange={(e) => setBillMedicinesTotal(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">પેમેન્ટ પદ્ધતિ</label>
                                    <select
                                        value={billPaymentMethod}
                                        onChange={(e) => setBillPaymentMethod(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI / GPay</option>
                                        <option value="Card">Card</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">સ્થિતિ</label>
                                    <select
                                        value={billPaymentStatus}
                                        onChange={(e) => setBillPaymentStatus(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                                    >
                                        <option value="Paid">Paid</option>
                                        <option value="Pending">Pending</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsBillModalOpen(false)}
                                    className="flex-1 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                >
                                    રદ કરો
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingBill}
                                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
                                >
                                    {isSavingBill ? 'સેવ થાય છે...' : 'સેવ કરો'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL 2: EXPENSE CREATE / EDIT ================= */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-3 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="font-extrabold text-sm text-slate-900">
                                {editingExpense ? 'ખર્ચમાં સુધારો (Edit Expense)' : 'નવો ખર્ચ ઉમેરો (Add Expense)'}
                            </h3>
                            <button onClick={() => setIsExpenseModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {formError && (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs flex items-center space-x-1.5">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSaveExpense} className="space-y-2.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">ખર્ચનું વિગત/શીર્ષક *</label>
                                <input
                                    type="text"
                                    required
                                    value={expenseTitle}
                                    onChange={(e) => setExpenseTitle(e.target.value)}
                                    placeholder="ખર્ચનું નામ"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">રકમ (₹) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={expenseAmount}
                                        onChange={(e) => setExpenseAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">કેટેગરી</label>
                                    <select
                                        value={expenseCategory}
                                        onChange={(e) => setExpenseCategory(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                                    >
                                        <option value="Staff Salary">Staff Salary</option>
                                        <option value="Clinic Rent">Clinic Rent</option>
                                        <option value="Electricity/Water">Electricity / Water</option>
                                        <option value="Tea/Snacks">Tea / Snacks</option>
                                        <option value="Medical Supplies">Medical Supplies</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsExpenseModalOpen(false)}
                                    className="flex-1 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                >
                                    રદ કરો
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingExpense}
                                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer"
                                >
                                    {isSavingExpense ? 'સેવ થાય છે...' : 'સેવ કરો'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL 3: APPOINTMENT CREATE / EDIT ================= */}
            {isAppointmentModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-3 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="font-extrabold text-sm text-slate-900">
                                {editingAppointment ? 'એપોઇન્ટમેન્ટમાં સુધારો' : 'નવી એપોઇન્ટમેન્ટ બુક કરો'}
                            </h3>
                            <button onClick={() => setIsAppointmentModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {formError && (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs flex items-center space-x-1.5">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSaveAppointment} className="space-y-2.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">દર્દીનું નામ *</label>
                                <input
                                    type="text"
                                    required
                                    value={apptPatientName}
                                    onChange={(e) => setApptPatientName(e.target.value)}
                                    placeholder="દર્દીનું નામ"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-violet-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">મોબાઈલ નંબર</label>
                                    <input
                                        type="tel"
                                        value={apptPhone}
                                        onChange={(e) => setApptPhone(e.target.value)}
                                        placeholder="૧૦ અંક"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">સમય</label>
                                    <input
                                        type="text"
                                        value={apptTime}
                                        onChange={(e) => setApptTime(e.target.value)}
                                        placeholder="10:30 AM"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">મુલાકાતનું કારણ</label>
                                <input
                                    type="text"
                                    value={apptReason}
                                    onChange={(e) => setApptReason(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-violet-500"
                                />
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAppointmentModalOpen(false)}
                                    className="flex-1 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                >
                                    રદ કરો
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingAppt}
                                    className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-xs cursor-pointer"
                                >
                                    {isSavingAppt ? 'સેવ થાય છે...' : 'સેવ કરો'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= MODAL 4: MEDICINE CREATE / EDIT ================= */}
            {isMedicineModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-3 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="font-extrabold text-sm text-slate-900">
                                {editingMedicine ? 'દવાની વિગતો સુધારો' : 'નવી દવા સ્ટોકમાં ઉમેરો'}
                            </h3>
                            <button onClick={() => setIsMedicineModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {formError && (
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs flex items-center space-x-1.5">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSaveMedicine} className="space-y-2.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">દવાનું નામ *</label>
                                <input
                                    type="text"
                                    required
                                    value={medName}
                                    onChange={(e) => setMedName(e.target.value)}
                                    placeholder="દવાનું નામ"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">કેટેગરી</label>
                                    <select
                                        value={medCategory}
                                        onChange={(e) => setMedCategory(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                                    >
                                        <option value="Tablet">Tablet</option>
                                        <option value="Syrup">Syrup</option>
                                        <option value="Injection">Injection</option>
                                        <option value="Ointment">Ointment</option>
                                        <option value="Surgical">Surgical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">ડોઝ</label>
                                    <input
                                        type="text"
                                        value={medDosage}
                                        onChange={(e) => setMedDosage(e.target.value)}
                                        placeholder="650mg, 100ml"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">હાલનો સ્ટોક (Quantity)</label>
                                    <input
                                        type="number"
                                        value={medQuantity}
                                        onChange={(e) => setMedQuantity(e.target.value)}
                                        placeholder="0"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">ઓછા સ્ટોકની ચેતવણી (Alert)</label>
                                    <input
                                        type="number"
                                        value={medLowStockAlert}
                                        onChange={(e) => setMedLowStockAlert(e.target.value)}
                                        placeholder="20"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsMedicineModalOpen(false)}
                                    className="flex-1 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                                >
                                    રદ કરો
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingMed}
                                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
                                >
                                    {isSavingMed ? 'સેવ થાય છે...' : 'સેવ કરો'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
