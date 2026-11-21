<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Clinic extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'doctor_name',
        'phone',
        'city',
        'specialization',
        'default_consultation_fee',
        'ai_assistant_name',
        'voice_name',
    ];

    protected $casts = [
        'default_consultation_fee' => 'decimal:2',
    ];

    public function patients()
    {
        return $this->hasMany(Patient::class);
    }

    public function medicines()
    {
        return $this->hasMany(ClinicMedicine::class);
    }

    public function bills()
    {
        return $this->hasMany(ClinicBill::class);
    }

    public function expenses()
    {
        return $this->hasMany(ClinicExpense::class);
    }
}
