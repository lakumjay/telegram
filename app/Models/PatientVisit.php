<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PatientVisit extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'visit_date',
        'photo_path',
        'diagnosis',
        'medicines',
        'symptoms',
        'notes',
        'raw_ocr_text',
        'extracted_data',
    ];

    protected $casts = [
        'visit_date' => 'date',
        'extracted_data' => 'array',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
