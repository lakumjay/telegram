<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Patient extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'opd_number',
        'name',
        'name_normalized',
        'name_gujarati',
        'phone',
        'age',
        'gender',
        'city',
        'address',
        'last_diagnosis',
        'last_medicines',
        'last_summary',
        'last_visit_date',
        'total_visits',
    ];

    protected $casts = [
        'last_visit_date' => 'date',
        'age' => 'integer',
        'total_visits' => 'integer',
    ];

    public function visits()
    {
        return $this->hasMany(PatientVisit::class)->orderBy('visit_date', 'desc')->orderBy('id', 'desc');
    }

    public function latestVisit()
    {
        return $this->hasOne(PatientVisit::class)->latestOfMany();
    }
}
