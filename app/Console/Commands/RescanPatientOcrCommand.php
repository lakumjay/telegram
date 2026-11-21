<?php

namespace App\Console\Commands;

use App\Models\Patient;
use App\Models\PatientVisit;
use App\Services\PatientOcrService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class RescanPatientOcrCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'patients:rescan-ocr {--clinic_id= : Specific clinic ID to re-scan} {--force : Force re-scan even if patient already has details}';

    /**
     * The console command description.
     */
    protected $description = 'Auto re-scan old patient prescription photos with Gemini 3 Flash and update doctor details';

    public function handle(PatientOcrService $ocrService): int
    {
        $this->info("🚀 Starting auto re-scan of prescription photos in the background...");
        $clinicId = $this->option('clinic_id');
        $force = (bool)$this->option('force');

        $query = PatientVisit::query()->with('patient');
        if (!empty($clinicId)) {
            $query->where('clinic_id', (int)$clinicId);
        }

        $visits = $query->get();
        $this->info("Found " . $visits->count() . " visit records in database.");

        $updatedCount = 0;

        foreach ($visits as $visit) {
            $patient = $visit->patient;

            $needsRescan = $force || !$patient ||
                empty($patient->opd_number) ||
                empty($patient->city) ||
                empty($patient->last_medicines) ||
                str_contains($patient->name, 'અજ્ઞાત') ||
                str_contains($patient->name, 'New Patient') ||
                str_starts_with($patient->name, 'દર્દી') ||
                str_contains($patient->last_diagnosis, 'સામાન્ય તપાસ');

            if (!$needsRescan) {
                continue;
            }

            $rawPath = $visit->photo_path;
            if (empty($rawPath)) {
                continue;
            }

            $cleanPath = ltrim(str_replace('/storage/', '', $rawPath), '/');
            $fullPath = storage_path('app/public/' . $cleanPath);

            if (!file_exists($fullPath)) {
                $fullPath = public_path(ltrim($rawPath, '/'));
            }

            if (!file_exists($fullPath)) {
                $this->warn("Photo file not found: {$rawPath}");
                continue;
            }

            $this->line("Scanning: {$fullPath}");
            $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
            $mime = ($ext === 'png') ? 'image/png' : 'image/jpeg';

            $extracted = $ocrService->analyzePrescription($fullPath, $mime);
            if (empty($extracted['patient_name']) || $extracted['patient_name'] === 'અજ્ઞાત દર્દી') {
                $this->warn("Could not extract new data for Visit #{$visit->id}");
                continue;
            }

            // Update PatientVisit
            $visit->update([
                'diagnosis' => $extracted['diagnosis'] ?: $visit->diagnosis,
                'medicines' => $extracted['medicines'] ?: $visit->medicines,
                'symptoms' => $extracted['symptoms'] ?: $visit->symptoms,
                'raw_ocr_text' => $extracted['raw_text'] ?? $visit->raw_ocr_text,
                'extracted_data' => $extracted,
            ]);

            // Update or Create Patient
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
            }

            $this->info("✅ Updated Patient: {$extracted['patient_name']} (OPD #{$extracted['opd_number']}, {$extracted['city']})");
            $updatedCount++;
        }

        // Also check any standalone prescription photos in storage/app/public/prescriptions
        $prescriptionDir = storage_path('app/public/prescriptions');
        if (File::isDirectory($prescriptionDir)) {
            $files = File::files($prescriptionDir);
            foreach ($files as $file) {
                $filename = $file->getFilename();
                if ($filename === '.gitignore') continue;

                $existingVisit = PatientVisit::where('photo_path', 'LIKE', "%{$filename}%")->first();
                if (!$existingVisit) {
                    $this->info("Found unlinked prescription photo: {$filename}. Analyzing...");
                    $ext = strtolower($file->getExtension());
                    $mime = ($ext === 'png') ? 'image/png' : 'image/jpeg';
                    $extracted = $ocrService->analyzePrescription($file->getPathname(), $mime);

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

                        $this->info("✅ Created Patient from unlinked photo: {$extracted['patient_name']} (OPD #{$extracted['opd_number']})");
                        $updatedCount++;
                    }
                }
            }
        }

        $this->info("🎉 Auto re-scan complete! Total updated records: {$updatedCount}");
        return 0;
    }
}
