<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Document;
use App\Models\ZipExport;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

class ZipService
{
    /**
     * Create ZIP archive organized by company folders
     *
     * @param array $documentIds
     * @param string $archiveMode 'single_master_zip' or 'separate_company_zips'
     * @return array
     */
    public function createZipFromDocuments(array $documentIds, string $archiveMode = 'single_master_zip'): array
    {
        $documents = Document::with(['company', 'folder'])->whereIn('id', $documentIds)->get();

        if ($documents->isEmpty()) {
            return [
                'success' => false,
                'message' => 'No documents found to archive.',
            ];
        }

        // Ensure storage export directory exists
        $exportDir = storage_path('app/public/zips');
        if (!File::exists($exportDir)) {
            File::makeDirectory($exportDir, 0755, true);
        }

        $sessionId = Str::uuid()->toString();

        if ($archiveMode === 'separate_company_zips') {
            return $this->createSeparateZipsPerCompany($documents, $sessionId, $exportDir);
        }

        // Default: Single Master ZIP with organized subfolders
        return $this->createMasterZipWithFolders($documents, $sessionId, $exportDir);
    }

    /**
     * Creates a Master ZIP with folders for each company
     */
    protected function createMasterZipWithFolders($documents, string $sessionId, string $exportDir): array
    {
        $zipFileName = 'Documents_Bundle_' . date('Ymd_His') . '.zip';
        $zipFilePath = $exportDir . '/' . $zipFileName;

        $zip = new ZipArchive();
        if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return ['success' => false, 'message' => 'Could not create ZIP archive.'];
        }

        $companiesIncluded = [];

        foreach ($documents as $doc) {
            $companyName = $doc->company ? Str::slug($doc->company->name, '_') : 'General_Documents';
            $companiesIncluded[$companyName] = ($companiesIncluded[$companyName] ?? 0) + 1;

            $folderName = $doc->folder ? Str::slug($doc->folder->name, '_') : '';
            $subPath = $companyName . ($folderName ? '/' . $folderName : '');

            $actualFilePath = storage_path('app/' . $doc->file_path);

            if (file_exists($actualFilePath)) {
                $filenameInsideZip = $subPath . '/' . $doc->original_filename;
                $zip->addFile($actualFilePath, $filenameInsideZip);
            } else {
                // If demo/mock file doesn't exist on disk, create a placeholder summary PDF/text file
                $placeholderText = "Document: {$doc->title}\nCompany: " . ($doc->company?->name ?? 'N/A') . "\nDoc Type: {$doc->doc_type}\nStamp Value: ₹{$doc->stamp_value}\n\nOCR Content Preview:\n" . substr($doc->ocr_text, 0, 500);
                $zip->addFromString($subPath . '/' . Str::slug($doc->title, '_') . '.txt', $placeholderText);
            }
        }

        $zip->close();

        $fileSize = file_exists($zipFilePath) ? filesize($zipFilePath) : 0;

        $export = ZipExport::create([
            'session_id' => $sessionId,
            'file_name' => $zipFileName,
            'file_path' => 'public/zips/' . $zipFileName,
            'file_size' => $fileSize,
            'companies_included' => array_keys($companiesIncluded),
            'documents_count' => $documents->count(),
            'expires_at' => now()->addDays(2),
        ]);

        return [
            'success' => true,
            'mode' => 'master_zip',
            'export' => $export,
            'file_name' => $zipFileName,
            'download_url' => url('/api/zip/' . $export->id . '/download'),
            'file_size_formatted' => $export->file_size_formatted,
            'companies_count' => count($companiesIncluded),
            'documents_count' => $documents->count(),
        ];
    }

    /**
     * Creates separate ZIPs for each requested company
     */
    protected function createSeparateZipsPerCompany($documents, string $sessionId, string $exportDir): array
    {
        $grouped = $documents->groupBy(function ($doc) {
            return $doc->company ? $doc->company->name : 'General';
        });

        $zips = [];

        foreach ($grouped as $compName => $docs) {
            $slug = Str::slug($compName, '_');
            $zipFileName = $slug . '_Documents_' . date('Ymd_His') . '.zip';
            $zipFilePath = $exportDir . '/' . $zipFileName;

            $zip = new ZipArchive();
            if ($zip->open($zipFilePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
                foreach ($docs as $doc) {
                    $actualFilePath = storage_path('app/' . $doc->file_path);
                    if (file_exists($actualFilePath)) {
                        $zip->addFile($actualFilePath, $doc->original_filename);
                    } else {
                        $placeholder = "Document: {$doc->title}\nCompany: {$compName}\nType: {$doc->doc_type}\nOCR Text: " . substr($doc->ocr_text, 0, 400);
                        $zip->addFromString(Str::slug($doc->title, '_') . '.txt', $placeholder);
                    }
                }
                $zip->close();

                $fileSize = file_exists($zipFilePath) ? filesize($zipFilePath) : 0;

                $export = ZipExport::create([
                    'session_id' => $sessionId,
                    'file_name' => $zipFileName,
                    'file_path' => 'public/zips/' . $zipFileName,
                    'file_size' => $fileSize,
                    'companies_included' => [$compName],
                    'documents_count' => $docs->count(),
                    'expires_at' => now()->addDays(2),
                ]);

                $zips[] = [
                    'company' => $compName,
                    'file_name' => $zipFileName,
                    'download_url' => url('/api/zip/' . $export->id . '/download'),
                    'file_size_formatted' => $export->file_size_formatted,
                    'documents_count' => $docs->count(),
                ];
            }
        }

        return [
            'success' => true,
            'mode' => 'separate_zips',
            'zips' => $zips,
            'total_zips' => count($zips),
        ];
    }
}
