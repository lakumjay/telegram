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
                    ->orWhere('opd_number', 'LIKE', "{$cleanQ}%")
                    ->orWhere('city', 'LIKE', "{$cleanQ}%")
                    ->orWhere('address', 'LIKE', "%{$cleanQ}%")
                    ->orWhere('last_diagnosis', 'LIKE', "%{$cleanQ}%");
            })
            ->where('clinic_id', $clinicId)
            ->select([
                'id',
                'name',
                'name_gujarati',
                'opd_number',
                'age',
                'gender',
                'city',
                'address',
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
                    ->orWhere('opd_number', 'LIKE', "%{$search}%")
                    ->orWhere('city', 'LIKE', "%{$search}%")
                    ->orWhere('address', 'LIKE', "%{$search}%")
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
        $address = trim($request->input('address') ?: ($extracted['address'] ?? null));
        $opdNumber = trim($request->input('opd_number') ?: ($extracted['opd_number'] ?? null));
        $age = !empty($extracted['age']) ? (int)$extracted['age'] : null;
        $gender = $extracted['gender'] ?? null;
        $visitDate = $request->input('visit_date') ?: ($extracted['visit_date'] ?? date('Y-m-d'));

        $diagnosis = $extracted['diagnosis'] ?: 'સામાન્ય તપાસ';
        $medicines = $extracted['medicines'] ?: '';
        $symptoms = $extracted['symptoms'] ?: '';
        
        // Smart summary for suggestion: e.g. "તાવ અને માથાનો દુખાવો (દવા: Paracetamol, Azithro)"
        $summary = $extracted['summary'] ?: ($diagnosis . ($medicines ? " (દવા: " . Str::limit($medicines, 45) . ")" : ""));

        $clinicId = (int)$request->input('clinic_id', 1);

        // Match existing patient by opd_number OR phone OR close name+city within the same clinic
        $patient = null;
        if (!empty($opdNumber)) {
            $patient = Patient::where('clinic_id', $clinicId)->where('opd_number', $opdNumber)->first();
        }
        if (!$patient && !empty($phone)) {
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
                    'opd_number' => $opdNumber,
                    'phone' => $phone,
                    'age' => $age,
                    'gender' => $gender,
                    'city' => $city,
                    'address' => $address,
                    'last_diagnosis' => $diagnosis,
                    'last_medicines' => $medicines,
                    'last_summary' => $summary,
                    'last_visit_date' => $visitDate,
                    'total_visits' => 1,
                ]);
            } else {
                $patient->update([
                    'opd_number' => $opdNumber ?: $patient->opd_number,
                    'age' => $age ?: $patient->age,
                    'gender' => $gender ?: $patient->gender,
                    'city' => $city ?: $patient->city,
                    'address' => $address ?: $patient->address,
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
     * Create / Store New Patient manually
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:30',
            'opd_number' => 'nullable|string|max:50',
            'address' => 'nullable|string',
            'age' => 'nullable|integer',
            'gender' => 'nullable|string|max:20',
            'city' => 'nullable|string|max:100',
            'visit_date' => 'nullable|date',
            'last_diagnosis' => 'nullable|string',
            'last_medicines' => 'nullable|string',
            'clinic_id' => 'nullable|integer',
        ]);

        $clinicId = (int)$request->input('clinic_id', 1);
        $name = trim($request->input('name'));
        $nameNormalized = Str::slug(mb_strtolower($name), '');
        $nameGujarati = $this->isGujarati($name) ? $name : null;
        $phone = trim($request->input('phone') ?: '');
        $opdNumber = trim($request->input('opd_number') ?: '');

        // Check if patient exists with same OPD number or phone in this clinic
        if (!empty($opdNumber)) {
            $existing = Patient::where('clinic_id', $clinicId)->where('opd_number', $opdNumber)->first();
            if ($existing) {
                return response()->json([
                    'success' => true,
                    'message' => 'આ ઓપીડી / કેસ નંબર વાળો દર્દી પહેલેથી નોંધાયેલ છે.',
                    'patient' => $existing,
                    'is_existing' => true,
                ]);
            }
        }

        if (!empty($phone)) {
            $existing = Patient::where('clinic_id', $clinicId)->where('phone', $phone)->first();
            if ($existing) {
                return response()->json([
                    'success' => true,
                    'message' => 'આ ફોન નંબર વાળો દર્દી પહેલેથી નોંધાયેલ છે.',
                    'patient' => $existing,
                    'is_existing' => true,
                ]);
            }
        }

        $patient = Patient::create([
            'clinic_id' => $clinicId,
            'name' => $name,
            'name_normalized' => $nameNormalized,
            'name_gujarati' => $nameGujarati,
            'opd_number' => $opdNumber ?: null,
            'phone' => $phone ?: null,
            'age' => $request->input('age') ? (int)$request->input('age') : null,
            'gender' => $request->input('gender') ?: 'Male',
            'city' => $request->input('city') ?: null,
            'address' => $request->input('address') ?: null,
            'last_diagnosis' => $request->input('last_diagnosis') ?: 'સામાન્ય તપાસ',
            'last_medicines' => $request->input('last_medicines') ?: '',
            'last_summary' => $request->input('last_diagnosis') ?: 'સામાન્ય તપાસ',
            'last_visit_date' => $request->input('visit_date') ?: date('Y-m-d'),
            'total_visits' => 1,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'દર્દી સફળતાપૂર્વક ઉમેરાઈ ગયો!',
            'patient' => $patient,
        ], 201);
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
            'opd_number',
            'address',
            'age',
            'gender',
            'city',
            'last_diagnosis',
            'last_medicines',
            'last_summary',
            'last_visit_date',
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

    /**
     * Upload photo / prescription document directly to an existing patient
     */
    public function uploadPhoto(Request $request, int $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);

        $request->validate([
            'photo' => 'required|file|mimes:jpg,jpeg,png,webp,pdf|max:20480',
            'diagnosis' => 'nullable|string|max:255',
            'medicines' => 'nullable|string',
            'notes' => 'nullable|string',
            'visit_date' => 'nullable|date',
        ]);

        $file = $request->file('photo');
        $originalExt = $file->getClientOriginalExtension() ?: 'jpg';
        $filename = 'rx_pt_' . $patient->id . '_' . date('Ymd_His') . '_' . Str::random(6) . '.' . $originalExt;

        $storedPath = $file->storeAs('prescriptions', $filename, 'public');
        $fullPath = storage_path('app/public/' . $storedPath);

        // Run Gemini OCR
        $extracted = [];
        try {
            $extracted = $this->ocrService->analyzePrescription($fullPath, $file->getClientMimeType());
        } catch (\Throwable $e) {}

        $diagnosis = $request->input('diagnosis') ?: ($extracted['diagnosis'] ?? $patient->last_diagnosis ?: 'સામાન્ય તપાસ');
        $medicines = $request->input('medicines') ?: ($extracted['medicines'] ?? $patient->last_medicines ?: '');
        $visitDate = $request->input('visit_date') ?: date('Y-m-d');

        $visit = PatientVisit::create([
            'clinic_id' => $patient->clinic_id,
            'patient_id' => $patient->id,
            'visit_date' => $visitDate,
            'photo_path' => '/storage/' . $storedPath,
            'diagnosis' => $diagnosis,
            'medicines' => $medicines,
            'symptoms' => $extracted['symptoms'] ?? null,
            'notes' => $request->input('notes') ?: (!empty($extracted['raw_text']) ? Str::limit($extracted['raw_text'], 300) : null),
            'raw_ocr_text' => $extracted['raw_text'] ?? null,
        ]);

        $patient->update([
            'last_diagnosis' => $diagnosis,
            'last_medicines' => $medicines,
            'last_visit_date' => $visitDate,
            'total_visits' => $patient->total_visits + 1,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'ફોટો અને પ્રિસ્ક્રિપ્શન સફળતાપૂર્વક અપલોડ થઈ ગયો!',
            'visit' => $visit,
            'patient' => $patient->load(['visits' => function ($q) {
                $q->orderBy('visit_date', 'desc')->orderBy('id', 'desc');
            }])
        ]);
    }

    /**
     * Delete a visit / prescription photo
     */
    public function deleteVisit(int $visitId): JsonResponse
    {
        $visit = PatientVisit::findOrFail($visitId);
        $patientId = $visit->patient_id;

        // Try deleting local file
        if ($visit->photo_path) {
            $relPath = str_replace('/storage/', '', $visit->photo_path);
            \Illuminate\Support\Facades\Storage::disk('public')->delete($relPath);
        }

        $visit->delete();

        $patient = Patient::with(['visits' => function ($q) {
            $q->orderBy('visit_date', 'desc')->orderBy('id', 'desc');
        }])->find($patientId);

        if ($patient) {
            $patient->update([
                'total_visits' => max(0, $patient->visits->count()),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'પ્રિસ્ક્રિપ્શન ફોટો સફળતાપૂર્વક ડિલીટ થઈ ગયો!',
            'patient' => $patient
        ]);
    }

    /**
     * Auto re-scan old patient records with Gemini 3 Flash in the background
     */
    public function rescanOcr(Request $request): JsonResponse
    {
        $clinicId = $request->input('clinic_id');
        $force = (bool)$request->input('force', true);

        $query = PatientVisit::query()->with('patient');
        if (!empty($clinicId)) {
            $query->where('clinic_id', (int)$clinicId);
        }

        $visits = $query->get();
        $updatedCount = 0;
        $updatedPatients = [];

        foreach ($visits as $visit) {
            $patient = $visit->patient;

            $rawPath = $visit->photo_path;
            if (empty($rawPath)) continue;

            $cleanPath = ltrim(str_replace('/storage/', '', $rawPath), '/');
            $fullPath = storage_path('app/public/' . $cleanPath);

            if (!file_exists($fullPath)) {
                $fullPath = public_path(ltrim($rawPath, '/'));
            }

            if (!file_exists($fullPath)) continue;

            $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
            $mime = ($ext === 'png') ? 'image/png' : 'image/jpeg';

            $extracted = $this->ocrService->analyzePrescription($fullPath, $mime);
            if (empty($extracted['patient_name']) || $extracted['patient_name'] === 'અજ્ઞાત દર્દી') {
                continue;
            }

            $visit->update([
                'diagnosis' => $extracted['diagnosis'] ?: $visit->diagnosis,
                'medicines' => $extracted['medicines'] ?: $visit->medicines,
                'symptoms' => $extracted['symptoms'] ?: $visit->symptoms,
                'raw_ocr_text' => $extracted['raw_text'] ?? $visit->raw_ocr_text,
                'extracted_data' => $extracted,
            ]);

            if ($patient) {
                $patient->update([
                    'name' => $extracted['patient_name'] ?: $patient->name,
                    'name_normalized' => Str::slug(mb_strtolower($extracted['patient_name'] ?: $patient->name), ''),
                    'name_gujarati' => $extracted['patient_name_gujarati'] ?: $patient->name_gujarati,
                    'opd_number' => $extracted['opd_number'] ?: $patient->opd_number,
                    'age' => !empty($extracted['age']) ? (int)$extracted['age'] : $patient->age,
                    'gender' => $extracted['gender'] ?: $patient->gender,
                    'city' => $extracted['city'] ?: $patient->city,
                    'address' => $extracted['address'] ?: $patient->address,
                    'phone' => $extracted['phone'] ?: $patient->phone,
                    'last_diagnosis' => $extracted['diagnosis'] ?: $patient->last_diagnosis,
                    'last_medicines' => $extracted['medicines'] ?: $patient->last_medicines,
                    'last_summary' => $extracted['summary'] ?: $patient->last_summary,
                    'last_visit_date' => $extracted['visit_date'] ?: $patient->last_visit_date,
                ]);
                $updatedPatients[] = $patient->fresh();
                $updatedCount++;
            }
        }

        // Also check standalone files in storage/app/public/prescriptions
        $prescriptionDir = storage_path('app/public/prescriptions');
        if (\Illuminate\Support\Facades\File::isDirectory($prescriptionDir)) {
            $files = \Illuminate\Support\Facades\File::files($prescriptionDir);
            foreach ($files as $file) {
                $filename = $file->getFilename();
                if ($filename === '.gitignore') continue;

                $existingVisit = PatientVisit::where('photo_path', 'LIKE', "%{$filename}%")->first();
                if (!$existingVisit) {
                    $ext = strtolower($file->getExtension());
                    $mime = ($ext === 'png') ? 'image/png' : 'image/jpeg';
                    $extracted = $this->ocrService->analyzePrescription($file->getPathname(), $mime);

                    if (!empty($extracted['patient_name']) && $extracted['patient_name'] !== 'અજ્ઞાત દર્દી') {
                        $targetClinic = (int)($clinicId ?: 1);
                        $patient = Patient::create([
                            'clinic_id' => $targetClinic,
                            'name' => $extracted['patient_name'],
                            'name_normalized' => Str::slug(mb_strtolower($extracted['patient_name']), ''),
                            'name_gujarati' => $extracted['patient_name_gujarati'] ?? null,
                            'opd_number' => $extracted['opd_number'] ?? null,
                            'age' => !empty($extracted['age']) ? (int)$extracted['age'] : null,
                            'gender' => $extracted['gender'] ?? 'Male',
                            'city' => $extracted['city'] ?? null,
                            'address' => $extracted['address'] ?? null,
                            'phone' => $extracted['phone'] ?? null,
                            'last_diagnosis' => $extracted['diagnosis'] ?? 'સામાન્ય તપાસ',
                            'last_medicines' => $extracted['medicines'] ?? '',
                            'last_summary' => $extracted['summary'] ?? '',
                            'last_visit_date' => $extracted['visit_date'] ?? date('Y-m-d'),
                            'total_visits' => 1,
                        ]);

                        PatientVisit::create([
                            'clinic_id' => $targetClinic,
                            'patient_id' => $patient->id,
                            'visit_date' => $extracted['visit_date'] ?? date('Y-m-d'),
                            'photo_path' => '/storage/prescriptions/' . $filename,
                            'diagnosis' => $extracted['diagnosis'] ?? 'સામાન્ય તપાસ',
                            'medicines' => $extracted['medicines'] ?? '',
                            'symptoms' => $extracted['symptoms'] ?? '',
                            'raw_ocr_text' => $extracted['raw_text'] ?? null,
                            'extracted_data' => $extracted,
                        ]);

                        $updatedPatients[] = $patient;
                        $updatedCount++;
                    }
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => "જૂના રેકોર્ડ્સ સફળતાપૂર્વક ફરી સ્કેન થઈ ગયા! ({$updatedCount} દર્દીઓ અપડેટ)",
            'updated_count' => $updatedCount,
            'patients' => $updatedPatients,
        ]);
    }

    protected function isGujarati(string $str): bool
    {
        return preg_match('/[\x{0A80}-\x{0AFF}]/u', $str) === 1;
    }
}
