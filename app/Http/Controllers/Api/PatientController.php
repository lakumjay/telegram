<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\PatientVisit;
use App\Services\PatientOcrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PatientController extends Controller
{
    protected PatientOcrService $ocrService;

    public function __construct(PatientOcrService $ocrService)
    {
        $this->ocrService = $ocrService;
    }

    /**
     * Ultra-fast suggestions & search API (Target < 25ms response time even with 1M rows)
     * Matches English or Gujarati names, phone, diagnosis, or medicines.
     */
    public function search(Request $request): JsonResponse
    {
        $clinicId = (int)$request->query('clinic_id', 1);
        $q = trim((string)$request->query('query', ''));

        if (mb_strlen($q) < 1) {
            return response()->json([
                'success' => true,
                'patients' => []
            ]);
        }

        $cleanQ = mb_strtolower($q);
        $cleanNormalized = Str::slug($cleanQ, '');

        // Query indexed columns with LIMIT 12 for instant suggestion popup scoped to clinic
        $patients = Patient::query()
            ->where(function ($sub) use ($cleanQ, $cleanNormalized) {
                $sub->where('name', 'LIKE', "{$cleanQ}%")
                    ->orWhere('name', 'LIKE', "%{$cleanQ}%")
                    ->orWhere('name_gujarati', 'LIKE', "%{$cleanQ}%")
                    ->orWhere('name_normalized', 'LIKE', "%{$cleanNormalized}%")
                    ->orWhere('phone', 'LIKE', "{$cleanQ}%")
                    ->orWhere('city', 'LIKE', "{$cleanQ}%")
                    ->orWhere('last_diagnosis', 'LIKE', "%{$cleanQ}%");
            })
            ->where('clinic_id', $clinicId)
            ->select([
                'id',
                'name',
                'name_gujarati',
                'age',
                'gender',
                'city',
                'phone',
                'last_diagnosis',
                'last_medicines',
                'last_summary',
                'last_visit_date',
                'total_visits'
            ])
            ->orderBy('last_visit_date', 'desc')
            ->limit(12)
            ->get();

        return response()->json([
            'success' => true,
            'query' => $q,
            'count' => $patients->count(),
            'patients' => $patients
        ]);
    }

    /**
     * List recent patients with pagination
     */
    public function index(Request $request): JsonResponse
    {
        $clinicId = (int)$request->query('clinic_id', 1);
        $perPage = (int)$request->query('per_page', 15);
        $search = trim((string)$request->query('search', ''));

        $query = Patient::query()
            ->where('clinic_id', $clinicId)
            ->withCount('visits')
            ->latest('last_visit_date');

        if (!empty($search)) {
            $query->where(function ($sub) use ($search) {
                $sub->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('name_gujarati', 'LIKE', "%{$search}%")
                    ->orWhere('phone', 'LIKE', "%{$search}%")
                    ->orWhere('city', 'LIKE', "%{$search}%")
                    ->orWhere('last_diagnosis', 'LIKE', "%{$search}%")
                    ->orWhere('last_medicines', 'LIKE', "%{$search}%");
            });
        }

        $patients = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $patients
        ]);
    }

    /**
     * Show single patient profile with all visit prescription photos & history
     */
    public function show(int $id): JsonResponse
    {
        $patient = Patient::with(['visits' => function ($q) {
            $q->orderBy('visit_date', 'desc')->orderBy('id', 'desc');
        }])->findOrFail($id);

        return response()->json([
            'success' => true,
            'patient' => $patient
        ]);
    }

    /**
     * Upload Prescription/Notes Page Photo, run Gemini OCR, and create or update patient record
     */
    public function uploadPrescription(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:20480', // up to 20MB
            'patient_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:30',
            'city' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'visit_date' => 'nullable|date',
        ]);

        $file = $request->file('photo');
        $originalExt = $file->getClientOriginalExtension() ?: 'jpg';
        $filename = 'rx_' . date('Ymd_His') . '_' . Str::random(8) . '.' . $originalExt;

        // Save into storage/app/public/prescriptions
        $storedPath = $file->storeAs('prescriptions', $filename, 'public');
        $fullPath = storage_path('app/public/' . $storedPath);

        // Run AI OCR on page
        $extracted = $this->ocrService->analyzePrescription($fullPath, $file->getClientMimeType());

        // Resolve Patient Identity
        $finalName = trim($request->input('patient_name') ?: ($extracted['patient_name'] ?? 'અજ્ઞાત દર્દી'));
        $finalGujarati = trim($extracted['patient_name_gujarati'] ?: ($this->isGujarati($finalName) ? $finalName : null));
        $normalizedName = Str::slug(mb_strtolower($finalName), '');

        $phone = trim($request->input('phone') ?: ($extracted['phone'] ?? null));
        $city = trim($request->input('city') ?: ($extracted['city'] ?? null));
        $age = !empty($extracted['age']) ? (int)$extracted['age'] : null;
        $gender = $extracted['gender'] ?? null;
        $visitDate = $request->input('visit_date') ?: ($extracted['visit_date'] ?? date('Y-m-d'));

        $diagnosis = $extracted['diagnosis'] ?: 'સામાન્ય તપાસ';
        $medicines = $extracted['medicines'] ?: '';
        $symptoms = $extracted['symptoms'] ?: '';
        
        // Smart summary for suggestion: e.g. "તાવ અને માથાનો દુખાવો (દવા: Paracetamol, Azithro)"
        $summary = $extracted['summary'] ?: ($diagnosis . ($medicines ? " (દવા: " . Str::limit($medicines, 45) . ")" : ""));

        $clinicId = (int)$request->input('clinic_id', 1);

        // Match existing patient by phone OR close name+city within the same clinic
        $patient = null;
        if (!empty($phone)) {
            $patient = Patient::where('clinic_id', $clinicId)->where('phone', $phone)->first();
        }
        if (!$patient && !empty($finalName) && $finalName !== 'અજ્ઞાત દર્દી') {
            $patient = Patient::where('clinic_id', $clinicId)
                ->where(function($q) use ($finalName, $normalizedName) {
                    $q->where('name', $finalName)
                      ->orWhere('name_normalized', $normalizedName);
                })
                ->first();
        }

        DB::beginTransaction();
        try {
            if (!$patient) {
                $patient = Patient::create([
                    'clinic_id' => $clinicId,
                    'name' => $finalName,
                    'name_normalized' => $normalizedName,
                    'name_gujarati' => $finalGujarati,
                    'phone' => $phone,
                    'age' => $age,
                    'gender' => $gender,
                    'city' => $city,
                    'last_diagnosis' => $diagnosis,
                    'last_medicines' => $medicines,
                    'last_summary' => $summary,
                    'last_visit_date' => $visitDate,
                    'total_visits' => 1,
                ]);
            } else {
                $patient->update([
                    'age' => $age ?: $patient->age,
                    'gender' => $gender ?: $patient->gender,
                    'city' => $city ?: $patient->city,
                    'phone' => $phone ?: $patient->phone,
                    'last_diagnosis' => $diagnosis,
                    'last_medicines' => $medicines,
                    'last_summary' => $summary,
                    'last_visit_date' => $visitDate,
                    'total_visits' => $patient->total_visits + 1,
                ]);
            }

            // Save Visit Record
            $visit = PatientVisit::create([
                'clinic_id' => $clinicId,
                'patient_id' => $patient->id,
                'visit_date' => $visitDate,
                'photo_path' => '/storage/' . $storedPath,
                'diagnosis' => $diagnosis,
                'medicines' => $medicines,
                'symptoms' => $symptoms,
                'notes' => $request->input('notes') ?: ($extracted['raw_text'] ? Str::limit($extracted['raw_text'], 300) : null),
                'raw_ocr_text' => $extracted['raw_text'] ?? null,
                'extracted_data' => $extracted,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Prescription page uploaded and patient history updated successfully!',
                'patient' => $patient,
                'visit' => $visit,
                'extracted' => $extracted,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error saving patient record: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Quick manual edit of patient basic info
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);
        $patient->update($request->only([
            'name',
            'phone',
            'age',
            'gender',
            'city',
            'last_diagnosis',
            'last_medicines',
            'last_summary'
        ]));

        if ($request->has('name')) {
            $patient->update([
                'name_normalized' => Str::slug(mb_strtolower($patient->name), '')
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Patient updated',
            'patient' => $patient
        ]);
    }

    /**
     * Delete patient record
     */
    public function destroy(int $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);
        $patient->delete();

        return response()->json([
            'success' => true,
            'message' => 'Patient record deleted successfully'
        ]);
    }

    protected function isGujarati(string $str): bool
    {
        return preg_match('/[\x{0A80}-\x{0AFF}]/u', $str) === 1;
    }
}
