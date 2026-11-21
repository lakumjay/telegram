<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\ClinicAppointment;
use App\Models\ClinicBill;
use App\Models\ClinicExpense;
use App\Models\ClinicMedicine;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ClinicAccountsController extends Controller
{
    /**
     * Get active clinic details or list all clinics for switching
     */
    public function getClinics(): JsonResponse
    {
        $clinics = Clinic::all();
        return response()->json([
            'success' => true,
            'clinics' => $clinics,
        ]);
    }

    /**
     * Update Clinic & Doctor Profile (Custom Logo, Doctor Name, Fees, Specialization)
     */
    public function updateClinicProfile(Request $request, int $id): JsonResponse
    {
        $clinic = Clinic::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'doctor_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:100',
            'city' => 'nullable|string|max:100',
            'clinic_address' => 'nullable|string',
            'specialization' => 'nullable|string|max:255',
            'qualification' => 'nullable|string|max:255',
            'registration_number' => 'nullable|string|max:100',
            'default_consultation_fee' => 'nullable|numeric',
            'ai_assistant_name' => 'nullable|string|max:50',
            'logo' => 'nullable|file|mimes:jpg,jpeg,png,webp,svg|max:10240',
        ]);

        $data = $request->only([
            'name',
            'doctor_name',
            'phone',
            'email',
            'city',
            'clinic_address',
            'specialization',
            'qualification',
            'registration_number',
            'default_consultation_fee',
            'ai_assistant_name',
        ]);

        if ($request->hasFile('logo')) {
            $logoFile = $request->file('logo');
            $logoPath = $logoFile->storeAs('clinic_logos', 'logo_' . $clinic->id . '_' . time() . '.' . $logoFile->getClientOriginalExtension(), 'public');
            $data['logo_url'] = '/storage/' . $logoPath;
        }

        $clinic->update($data);

        return response()->json([
            'success' => true,
            'message' => 'ડૉક્ટર અને ક્લિનિક પ્રોફાઇલ સફળતાપૂર્વક અપડેટ થઈ ગઈ!',
            'clinic' => $clinic,
        ]);
    }

    /**
     * Get Daily and Monthly Income, Expenses, Bills and Profit Summary accurately from database
     */
    public function getFinancialSummary(Request $request): JsonResponse
    {
        $clinicId = (int)$request->query('clinic_id', 1);
        $date = $request->query('date', date('Y-m-d'));
        $month = $request->query('month', date('Y-m'));

        // 1. Selected Date's Summary
        $todayBills = ClinicBill::where('clinic_id', $clinicId)
            ->whereDate('bill_date', $date)
            ->orderBy('id', 'desc')
            ->get();
        $todayIncome = (float)$todayBills->sum('total_amount');
        $todayPatientsCount = $todayBills->count();

        $todayExpenses = ClinicExpense::where('clinic_id', $clinicId)
            ->whereDate('expense_date', $date)
            ->orderBy('id', 'desc')
            ->get();
        $todayExpenseTotal = (float)$todayExpenses->sum('amount');
        $todayNetProfit = $todayIncome - $todayExpenseTotal;

        // 2. This Month's Summary
        $monthBills = ClinicBill::where('clinic_id', $clinicId)
            ->where('bill_date', 'LIKE', "{$month}%")
            ->get();
        $monthIncome = (float)$monthBills->sum('total_amount');
        $monthPatientsCount = $monthBills->count();

        $monthExpenses = ClinicExpense::where('clinic_id', $clinicId)
            ->where('expense_date', 'LIKE', "{$month}%")
            ->get();
        $monthExpenseTotal = (float)$monthExpenses->sum('amount');
        $monthNetProfit = $monthIncome - $monthExpenseTotal;

        // 3. Appointments for selected date
        $todayAppointmentsCount = ClinicAppointment::where('clinic_id', $clinicId)
            ->whereDate('appointment_date', $date)
            ->count();

        // 4. Low stock medicines count
        $lowStockCount = ClinicMedicine::where('clinic_id', $clinicId)
            ->whereRaw('stock_quantity <= low_stock_alert')
            ->count();

        // 5. Total Clinic Patients & Recent Patients with payment status
        $totalPatientsCount = Patient::where('clinic_id', $clinicId)->count();
        $recentPatients = Patient::where('clinic_id', $clinicId)
            ->orderBy('last_visit_date', 'desc')
            ->orderBy('id', 'desc')
            ->take(8)
            ->get()
            ->map(function ($patient) use ($clinicId) {
                $lastBill = ClinicBill::where('clinic_id', $clinicId)
                    ->where(function ($q) use ($patient) {
                        $q->where('patient_id', $patient->id)
                          ->orWhere('patient_name', $patient->name);
                    })
                    ->latest('id')
                    ->first();

                return [
                    'id' => $patient->id,
                    'name' => $patient->name,
                    'phone' => $patient->phone,
                    'last_visit_date' => $patient->last_visit_date ? $patient->last_visit_date->format('d-m-Y') : date('d-m-Y'),
                    'last_diagnosis' => $patient->last_diagnosis,
                    'status' => $lastBill ? ($lastBill->payment_status ?: 'Paid') : 'Paid',
                    'amount' => $lastBill ? (float)$lastBill->total_amount : 300.0,
                ];
            });

        return response()->json([
            'success' => true,
            'clinic_id' => $clinicId,
            'total_patients_count' => $totalPatientsCount,
            'appointments_count' => $todayAppointmentsCount,
            'recent_patients' => $recentPatients,
            'today' => [
                'date' => $date,
                'income' => $todayIncome,
                'expense' => $todayExpenseTotal,
                'net_profit' => $todayNetProfit,
                'patients_count' => $todayPatientsCount,
                'bills' => $todayBills,
                'expenses' => $todayExpenses,
            ],
            'month' => [
                'month' => $month,
                'income' => $monthIncome,
                'expense' => $monthExpenseTotal,
                'net_profit' => $monthNetProfit,
                'patients_count' => $monthPatientsCount,
            ],
            'low_stock_count' => $lowStockCount,
        ]);
    }

    /**
     * Create OPD Patient Bill & auto-reduce stock if medicines selected
     */
    public function storeBill(Request $request): JsonResponse
    {
        $request->validate([
            'clinic_id' => 'required|integer',
            'patient_name' => 'required|string',
            'consultation_fee' => 'nullable|numeric',
            'medicines_total' => 'nullable|numeric',
            'procedure_fee' => 'nullable|numeric',
            'discount' => 'nullable|numeric',
            'payment_method' => 'nullable|string',
            'bill_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'items' => 'nullable|array', // e.g. [{"medicine_id": 1, "qty": 10, "price": 25}]
        ]);

        $clinicId = (int)$request->input('clinic_id');
        $consultation = (float)$request->input('consultation_fee', 0);
        $medsTotal = (float)$request->input('medicines_total', 0);
        $procedure = (float)$request->input('procedure_fee', 0);
        $discount = (float)$request->input('discount', 0);
        $total = max(0, ($consultation + $medsTotal + $procedure) - $discount);

        $billNumber = 'BL-' . date('Ymd') . '-' . strtoupper(Str::random(4));

        DB::beginTransaction();
        try {
            // Deduct stock if items were dispensed
            $items = $request->input('items', []);
            if (is_array($items)) {
                foreach ($items as $item) {
                    if (!empty($item['medicine_id']) && !empty($item['qty'])) {
                        $med = ClinicMedicine::where('clinic_id', $clinicId)->find($item['medicine_id']);
                        if ($med) {
                            $med->decrement('stock_quantity', (int)$item['qty']);
                        }
                    }
                }
            }

            $bill = ClinicBill::create([
                'clinic_id' => $clinicId,
                'patient_id' => $request->input('patient_id'),
                'bill_number' => $billNumber,
                'bill_date' => $request->input('bill_date') ?: date('Y-m-d'),
                'patient_name' => $request->input('patient_name'),
                'consultation_fee' => $consultation,
                'medicines_total' => $medsTotal,
                'procedure_fee' => $procedure,
                'discount' => $discount,
                'total_amount' => $total,
                'payment_method' => $request->input('payment_method') ?: 'Cash',
                'payment_status' => 'Paid',
                'notes' => $request->input('notes'),
                'items' => $items,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Bill created successfully!',
                'bill' => $bill,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error saving bill: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Add Daily Expense
     */
    public function storeExpense(Request $request): JsonResponse
    {
        $request->validate([
            'clinic_id' => 'required|integer',
            'title' => 'required|string',
            'amount' => 'required|numeric',
            'category' => 'nullable|string',
            'payment_mode' => 'nullable|string',
            'expense_date' => 'nullable|date',
            'remarks' => 'nullable|string',
        ]);

        $expense = ClinicExpense::create([
            'clinic_id' => (int)$request->input('clinic_id'),
            'expense_date' => $request->input('expense_date') ?: date('Y-m-d'),
            'category' => $request->input('category') ?: 'Clinic Expense',
            'title' => $request->input('title'),
            'amount' => (float)$request->input('amount'),
            'payment_mode' => $request->input('payment_mode') ?: 'Cash',
            'remarks' => $request->input('remarks'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Expense recorded successfully!',
            'expense' => $expense,
        ]);
    }

    /**
     * List Medicines / Stock with Low Stock Indicators
     */
    public function getMedicines(Request $request): JsonResponse
    {
        $clinicId = (int)$request->query('clinic_id', 1);
        $search = trim((string)$request->query('search', ''));

        $query = ClinicMedicine::where('clinic_id', $clinicId)->orderBy('name');

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('category', 'LIKE', "%{$search}%")
                  ->orWhere('dosage', 'LIKE', "%{$search}%");
            });
        }

        $medicines = $query->get();

        return response()->json([
            'success' => true,
            'medicines' => $medicines,
        ]);
    }

    /**
     * Add or update Medicine Stock
     */
    public function storeMedicine(Request $request): JsonResponse
    {
        $request->validate([
            'clinic_id' => 'required|integer',
            'name' => 'required|string',
            'stock_quantity' => 'required|integer',
            'category' => 'nullable|string',
            'dosage' => 'nullable|string',
            'low_stock_alert' => 'nullable|integer',
            'unit_cost' => 'nullable|numeric',
            'selling_price' => 'nullable|numeric',
            'expiry_date' => 'nullable|date',
        ]);

        $clinicId = (int)$request->input('clinic_id');

        $medicine = ClinicMedicine::updateOrCreate(
            [
                'clinic_id' => $clinicId,
                'name' => trim($request->input('name')),
            ],
            [
                'category' => $request->input('category') ?: 'Tablet',
                'dosage' => $request->input('dosage'),
                'stock_quantity' => (int)$request->input('stock_quantity'),
                'low_stock_alert' => (int)($request->input('low_stock_alert') ?: 20),
                'unit_cost' => (float)$request->input('unit_cost', 0),
                'selling_price' => (float)$request->input('selling_price', 0),
                'expiry_date' => $request->input('expiry_date'),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Medicine stock updated successfully!',
            'medicine' => $medicine,
        ]);
    }

    /**
     * Get Bills list with filters
     */
    public function getBills(Request $request): JsonResponse
    {
        $clinicId = (int)$request->query('clinic_id', 1);
        $date = $request->query('date');
        $search = trim((string)$request->query('search', ''));

        $query = ClinicBill::where('clinic_id', $clinicId)->orderBy('bill_date', 'desc')->orderBy('id', 'desc');

        if (!empty($date)) {
            $query->whereDate('bill_date', $date);
        }

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('patient_name', 'LIKE', "%{$search}%")
                  ->orWhere('bill_number', 'LIKE', "%{$search}%");
            });
        }

        $bills = $query->paginate(20);

        return response()->json([
            'success' => true,
            'bills' => $bills,
        ]);
    }

    /**
     * Show single Bill
     */
    public function showBill(int $id): JsonResponse
    {
        $bill = ClinicBill::with('patient')->findOrFail($id);
        return response()->json([
            'success' => true,
            'bill' => $bill,
        ]);
    }

    /**
     * Update Bill
     */
    public function updateBill(Request $request, int $id): JsonResponse
    {
        $bill = ClinicBill::findOrFail($id);

        $request->validate([
            'patient_name' => 'required|string',
            'consultation_fee' => 'nullable|numeric',
            'medicines_total' => 'nullable|numeric',
            'procedure_fee' => 'nullable|numeric',
            'discount' => 'nullable|numeric',
            'payment_method' => 'nullable|string',
            'payment_status' => 'nullable|string',
            'bill_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $consultation = (float)$request->input('consultation_fee', $bill->consultation_fee);
        $medsTotal = (float)$request->input('medicines_total', $bill->medicines_total);
        $procedure = (float)$request->input('procedure_fee', $bill->procedure_fee);
        $discount = (float)$request->input('discount', $bill->discount);
        $total = max(0, ($consultation + $medsTotal + $procedure) - $discount);

        $bill->update([
            'patient_name' => $request->input('patient_name'),
            'consultation_fee' => $consultation,
            'medicines_total' => $medsTotal,
            'procedure_fee' => $procedure,
            'discount' => $discount,
            'total_amount' => $total,
            'payment_method' => $request->input('payment_method') ?: $bill->payment_method,
            'payment_status' => $request->input('payment_status') ?: $bill->payment_status,
            'bill_date' => $request->input('bill_date') ?: $bill->bill_date,
            'notes' => $request->input('notes'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'બિલ સફળતાપૂર્વક અપડેટ થઈ ગયું!',
            'bill' => $bill,
        ]);
    }

    /**
     * Delete Bill
     */
    public function deleteBill(int $id): JsonResponse
    {
        $bill = ClinicBill::findOrFail($id);
        $bill->delete();

        return response()->json([
            'success' => true,
            'message' => 'બિલ સફળતાપૂર્વક ડિલીટ થઈ ગયું!',
        ]);
    }

    /**
     * Get Expenses list with filters
     */
    public function getExpenses(Request $request): JsonResponse
    {
        $clinicId = (int)$request->query('clinic_id', 1);
        $date = $request->query('date');
        $search = trim((string)$request->query('search', ''));

        $query = ClinicExpense::where('clinic_id', $clinicId)->orderBy('expense_date', 'desc')->orderBy('id', 'desc');

        if (!empty($date)) {
            $query->whereDate('expense_date', $date);
        }

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                  ->orWhere('category', 'LIKE', "%{$search}%");
            });
        }

        $expenses = $query->paginate(20);

        return response()->json([
            'success' => true,
            'expenses' => $expenses,
        ]);
    }

    /**
     * Update Expense
     */
    public function updateExpense(Request $request, int $id): JsonResponse
    {
        $expense = ClinicExpense::findOrFail($id);

        $request->validate([
            'title' => 'required|string',
            'amount' => 'required|numeric',
            'category' => 'nullable|string',
            'payment_mode' => 'nullable|string',
            'expense_date' => 'nullable|date',
            'remarks' => 'nullable|string',
        ]);

        $expense->update([
            'title' => $request->input('title'),
            'amount' => (float)$request->input('amount'),
            'category' => $request->input('category') ?: $expense->category,
            'payment_mode' => $request->input('payment_mode') ?: $expense->payment_mode,
            'expense_date' => $request->input('expense_date') ?: $expense->expense_date,
            'remarks' => $request->input('remarks'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'ખર્ચ સફળતાપૂર્વક અપડેટ થઈ ગયો!',
            'expense' => $expense,
        ]);
    }

    /**
     * Delete Expense
     */
    public function deleteExpense(int $id): JsonResponse
    {
        $expense = ClinicExpense::findOrFail($id);
        $expense->delete();

        return response()->json([
            'success' => true,
            'message' => 'ખર્ચ સફળતાપૂર્વક ડિલીટ થઈ ગયો!',
        ]);
    }

    /**
     * Get Appointments
     */
    public function getAppointments(Request $request): JsonResponse
    {
        $clinicId = (int)$request->query('clinic_id', 1);
        $date = $request->query('date');
        $status = $request->query('status');

        $query = ClinicAppointment::where('clinic_id', $clinicId)->orderBy('appointment_date', 'desc')->orderBy('appointment_time', 'asc');

        if (!empty($date)) {
            $query->whereDate('appointment_date', $date);
        }

        if (!empty($status)) {
            $query->where('status', $status);
        }

        $appointments = $query->get();

        return response()->json([
            'success' => true,
            'appointments' => $appointments,
        ]);
    }

    /**
     * Store Appointment
     */
    public function storeAppointment(Request $request): JsonResponse
    {
        $request->validate([
            'clinic_id' => 'required|integer',
            'patient_name' => 'required|string',
            'phone' => 'nullable|string',
            'appointment_date' => 'required|date',
            'appointment_time' => 'nullable|string',
            'reason' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $appt = ClinicAppointment::create([
            'clinic_id' => (int)$request->input('clinic_id'),
            'patient_id' => $request->input('patient_id'),
            'patient_name' => $request->input('patient_name'),
            'phone' => $request->input('phone'),
            'appointment_date' => $request->input('appointment_date'),
            'appointment_time' => $request->input('appointment_time') ?: '10:00 AM',
            'status' => 'Confirmed',
            'reason' => $request->input('reason') ?: 'તપાસ (General Checkup)',
            'notes' => $request->input('notes'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'એપોઇન્ટમેન્ટ સફળતાપૂર્વક બુક થઈ ગઈ!',
            'appointment' => $appt,
        ], 201);
    }

    /**
     * Update Appointment
     */
    public function updateAppointment(Request $request, int $id): JsonResponse
    {
        $appt = ClinicAppointment::findOrFail($id);

        $appt->update($request->only([
            'patient_name',
            'phone',
            'appointment_date',
            'appointment_time',
            'status',
            'reason',
            'notes',
        ]));

        return response()->json([
            'success' => true,
            'message' => 'એપોઇન્ટમેન્ટ અપડેટ થઈ ગઈ!',
            'appointment' => $appt,
        ]);
    }

    /**
     * Delete Appointment
     */
    public function deleteAppointment(int $id): JsonResponse
    {
        $appt = ClinicAppointment::findOrFail($id);
        $appt->delete();

        return response()->json([
            'success' => true,
            'message' => 'એપોઇન્ટમેન્ટ ડિલીટ થઈ ગઈ!',
        ]);
    }

    /**
     * Update Medicine
     */
    public function updateMedicine(Request $request, int $id): JsonResponse
    {
        $med = ClinicMedicine::findOrFail($id);

        $med->update([
            'name' => $request->input('name', $med->name),
            'category' => $request->input('category', $med->category),
            'dosage' => $request->input('dosage', $med->dosage),
            'stock_quantity' => (int)$request->input('stock_quantity', $med->stock_quantity),
            'low_stock_alert' => (int)$request->input('low_stock_alert', $med->low_stock_alert),
            'unit_cost' => (float)$request->input('unit_cost', $med->unit_cost),
            'selling_price' => (float)$request->input('selling_price', $med->selling_price),
            'expiry_date' => $request->input('expiry_date', $med->expiry_date),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'દવા સફળતાપૂર્વક અપડેટ થઈ ગઈ!',
            'medicine' => $med,
        ]);
    }

    /**
     * Delete Medicine
     */
    public function deleteMedicine(int $id): JsonResponse
    {
        $med = ClinicMedicine::findOrFail($id);
        $med->delete();

        return response()->json([
            'success' => true,
            'message' => 'દવા સફળતાપૂર્વક ડિલીટ થઈ ગઈ!',
        ]);
    }
}
