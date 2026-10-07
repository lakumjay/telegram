<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Folder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CompanyController extends Controller
{
    /**
     * List all companies with folder counts & document counts
     */
    public function index(): JsonResponse
    {
        $companies = Company::with(['folders.documents', 'documents'])
            ->withCount(['documents', 'folders'])
            ->get();

        return response()->json([
            'success' => true,
            'companies' => $companies,
        ]);
    }

    /**
     * Store new Company
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'nullable|string|in:company,person,firm,partnership',
            'owner_name' => 'nullable|string|max:255',
            'pan_number' => 'nullable|string|max:20',
            'gst_number' => 'nullable|string|max:30',
            'aliases' => 'nullable|array',
            'description' => 'nullable|string',
        ]);

        $validated['slug'] = Str::slug($validated['name']) . '-' . rand(100, 999);
        $company = Company::create($validated);

        // Auto-create standard folders for convenience
        $defaultFolders = ['KYC & Identity', 'Tax & GST', 'Legal & Stamp Papers', 'Registrations & Certs'];
        foreach ($defaultFolders as $fName) {
            Folder::create([
                'company_id' => $company->id,
                'name' => $fName,
                'slug' => Str::slug($fName),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Company and standard folders created successfully',
            'company' => $company->fresh(['folders']),
        ], 201);
    }

    /**
     * Create subfolder
     */
    public function storeFolder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_id' => 'required|exists:companies,id',
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:folders,id',
            'color' => 'nullable|string',
        ]);

        $validated['slug'] = Str::slug($validated['name']);
        $folder = Folder::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Folder created successfully',
            'folder' => $folder,
        ], 201);
    }
}
