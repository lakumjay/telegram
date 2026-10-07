<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ZipExport extends Model
{
    protected $fillable = [
        'session_id',
        'file_name',
        'file_path',
        'file_size',
        'companies_included',
        'documents_count',
        'expires_at',
    ];

    protected $casts = [
        'companies_included' => 'array',
        'expires_at' => 'datetime',
    ];

    protected $appends = ['download_url', 'file_size_formatted'];

    public function getDownloadUrlAttribute(): string
    {
        return url('/api/zip/' . $this->id . '/download');
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
