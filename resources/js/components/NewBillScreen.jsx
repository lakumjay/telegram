import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ArrowLeft, 
    Printer, 
    User, 
    Phone, 
    Calendar, 
    CheckCircle2, 
    AlertCircle, 
    Share2, 
    Download, 
    Receipt, 
    Plus, 
    Trash2,
    Clock,
    Sparkles
} from 'lucide-react';

export default function NewBillScreen({ 
    activeClinic, 
    onBack, 
    onBillGenerated,
    initialPatient = null
}) {
    const clinicId = activeClinic?.id || 1;
    const defaultConsultation = activeClinic?.default_consultation_fee || 500;

    const [patientName, setPatientName] = useState(initialPatient?.name || 'Hetal Sharma');
    const [patientPhone, setPatientPhone] = useState(initialPatient?.phone || '9824512345');
    const [patientId, setPatientId] = useState(initialPatient?.id || null);

    // Charge Breakdown matching Screen 5
    const [consultationFee, setConsultationFee] = useState(defaultConsultation);
    const [medicineCharges, setMedicineCharges] = useState(650);
    const [labCharges, setLabCharges] = useState(200);
    const [otherCharges, setOtherCharges] = useState(100);
    const [discount, setDiscount] = useState(0);

    // Payment Methods: Cash, UPI, Card, Other
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const paymentMethods = ['Cash', 'UPI', 'Card', 'Other'];

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedInvoice, setGeneratedInvoice] = useState(null);
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

    // Calculate Total Amount
    const totalAmount = Math.max(0, (
        Number(consultationFee || 0) + 
        Number(medicineCharges || 0) + 
        Number(labCharges || 0) + 
        Number(otherCharges || 0) - 
        Number(discount || 0)
    ));

    const handleGenerateBill = async () => {
        if (!patientName.trim()) {
            setStatusMessage({ type: 'error', text: 'દર્દીનું નામ દાખલ કરો.' });
            return;
        }

        setIsSubmitting(true);
        setStatusMessage({ type: '', text: '' });

        try {
            const res = await axios.post('/api/clinic-accounts/bills', {
                clinic_id: clinicId,
                patient_id: patientId,
                patient_name: patientName,
                consultation_fee: consultationFee,
                medicines_total: medicineCharges,
                procedure_fee: Number(labCharges) + Number(otherCharges),
                discount: discount,
                payment_method: paymentMethod,
                bill_date: new Date().toISOString().split('T')[0],
                notes: 'OPD Bill Consultation'
            });

            if (res.data?.success) {
                setGeneratedInvoice(res.data.bill);
                setStatusMessage({ type: 'success', text: '✅ બિલ સફળતાપૂર્વક બની ગયું!' });
                if (onBillGenerated) onBillGenerated(res.data.bill);
            }
        } catch (err) {
            console.error('Bill error:', err);
            setStatusMessage({ 
                type: 'error', 
                text: err.response?.data?.message || 'બિલ બનાવવામાં ક્ષતિ આવી.' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrintInvoice = () => {
        window.print();
    };

    const handleShareWhatsApp = () => {
        const text = `*${activeClinic?.name || 'શ્રીરામ ક્લિનિક'} - OPD Bill*\nદર્દી: ${patientName}\nકુલ રકમ: ₹${totalAmount}\nપેમેન્ટ: ${paymentMethod}\nતારીખ: ${new Date().toLocaleDateString('gu-IN')}\nસ્વસ્થ રહો, આભાર!`;
        const url = `https://wa.me/91${patientPhone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="max-w-xl mx-auto space-y-4 pb-20">
            
            {/* Header matching Screen 5 */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={onBack}
                        className="w-9 h-9 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h2 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                            New Bill
                        </h2>
                        <p className="text-[11px] text-slate-400 font-medium">
                            {activeClinic?.name || 'શ્રીરામ ક્લિનિક'} • OPD બિલિંગ
                        </p>
                    </div>
                </div>

                <button
                    onClick={handlePrintInvoice}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    title="Print Bill"
                >
                    <Printer className="w-4 h-4" />
                </button>
            </div>

            {/* Error / Success Toast */}
            {statusMessage.text && (
                <div className={`p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 ${
                    statusMessage.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{statusMessage.text}</span>
                </div>
            )}

            {/* Selected Patient Card matching Screen 5 */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-800 font-bold text-base flex items-center justify-center">
                        {patientName ? patientName.charAt(0) : 'P'}
                    </div>
                    <div>
                        <h3 className="font-extrabold text-sm text-slate-900">
                            {patientName}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" /> {patientPhone}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => onBack()}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-emerald-700 border border-slate-200/80 font-bold text-xs transition cursor-pointer"
                >
                    View History
                </button>
            </div>

            {/* Charges Breakdown matching Screen 5 */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3.5">
                <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">
                    ચાર્જીસ બ્રેકડાઉન (Charges Breakdown)
                </h4>

                {/* 1. Consultation Fee */}
                <div className="flex items-center justify-between py-1">
                    <div className="flex items-center space-x-2.5">
                        <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">🩺</span>
                        <span className="font-bold text-xs text-slate-800">Consultation Fee</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span className="text-xs font-bold text-slate-400">₹</span>
                        <input
                            type="number"
                            value={consultationFee}
                            onChange={(e) => setConsultationFee(e.target.value)}
                            className="w-20 px-2.5 py-1 text-right rounded-lg border border-slate-200 font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                {/* 2. Medicine Charges */}
                <div className="flex items-center justify-between py-1">
                    <div className="flex items-center space-x-2.5">
                        <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">💊</span>
                        <span className="font-bold text-xs text-slate-800">Medicine Charges</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span className="text-xs font-bold text-slate-400">₹</span>
                        <input
                            type="number"
                            value={medicineCharges}
                            onChange={(e) => setMedicineCharges(e.target.value)}
                            className="w-20 px-2.5 py-1 text-right rounded-lg border border-slate-200 font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                {/* 3. Lab Charges */}
                <div className="flex items-center justify-between py-1">
                    <div className="flex items-center space-x-2.5">
                        <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xs">🧪</span>
                        <span className="font-bold text-xs text-slate-800">Lab Charges</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span className="text-xs font-bold text-slate-400">₹</span>
                        <input
                            type="number"
                            value={labCharges}
                            onChange={(e) => setLabCharges(e.target.value)}
                            className="w-20 px-2.5 py-1 text-right rounded-lg border border-slate-200 font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                {/* 4. Other Charges */}
                <div className="flex items-center justify-between py-1">
                    <div className="flex items-center space-x-2.5">
                        <span className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-xs">📋</span>
                        <span className="font-bold text-xs text-slate-800">Other Charges</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <span className="text-xs font-bold text-slate-400">₹</span>
                        <input
                            type="number"
                            value={otherCharges}
                            onChange={(e) => setOtherCharges(e.target.value)}
                            className="w-20 px-2.5 py-1 text-right rounded-lg border border-slate-200 font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                {/* Total Amount Box matching Screen 5 */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-black text-sm text-slate-900">Total Amount</span>
                    <span className="font-black text-xl text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-xl border border-emerald-200">
                        ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                </div>
            </div>

            {/* Payment Method Chips matching Screen 5 */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-2.5">
                <label className="block text-xs font-bold text-slate-500">
                    Payment Method
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {paymentMethods.map(method => (
                        <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`py-2 px-3 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer text-center ${
                                paymentMethod === method
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                        >
                            {method}
                        </button>
                    ))}
                </div>
            </div>

            {/* Big Action Button matching Screen 5 */}
            <button
                type="button"
                onClick={handleGenerateBill}
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-md shadow-emerald-700/20 active:scale-98 transition cursor-pointer"
            >
                <Receipt className="w-4 h-4 text-emerald-200" />
                <span>{isSubmitting ? 'બિલ બની રહ્યું છે...' : 'Generate Bill'}</span>
            </button>

            {/* WhatsApp Share option if invoice generated */}
            {generatedInvoice && (
                <div className="flex items-center space-x-2 pt-1 animate-in fade-in">
                    <button
                        onClick={handleShareWhatsApp}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-xs"
                    >
                        <Share2 className="w-4 h-4" />
                        <span>WhatsApp પર બિલ મોકલો</span>
                    </button>
                    <button
                        onClick={handlePrintInvoice}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-1.5"
                    >
                        <Printer className="w-4 h-4" />
                        <span>પ્રિન્ટ</span>
                    </button>
                </div>
            )}

        </div>
    );
}
