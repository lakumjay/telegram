<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'type',
        'owner_name',
        'pan_number',
        'gst_number',
        'aliases',
        'description',
    ];

    protected $casts = [
        'aliases' => 'array',
    ];

    public function folders(): HasMany
    {
        return $this->hasMany(Folder::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }
}
