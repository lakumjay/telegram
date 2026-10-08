<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Document extends Model
{
    protected $fillable = [
        'company_id',
        'folder_id',
        'title',
        'doc_type',
        'original_filename',
        'file_path',
        'file_size',
        'mime_type',
        'page_count',
        'stamp_value',
        'parties',
        'issue_date',
        'expiry_date',
        'ocr_status',
        'ocr_text',
        'search_keywords',
        'metadata',
    ];

    protected $casts = [
        'stamp_value' => 'decimal:2',
        'parties' => 'array',
        'metadata' => 'array',
        'issue_date' => 'date',
        'expiry_date' => 'date',
    ];

    protected $appends = ['download_url', 'file_size_formatted'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
    }

    public function pages(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(DocumentPage::class);
    }

    public function getDownloadUrlAttribute(): string
    {
        return url('/api/documents/' . $this->id . '/download');
    }

    public function getFileSizeFormattedAttribute(): string
    {
        $bytes = $this->file_size ?: 0;
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' B';
    }
}
