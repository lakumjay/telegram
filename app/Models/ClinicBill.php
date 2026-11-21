<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClinicBill extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'patient_id',
        'bill_number',
        'bill_date',
        'patient_name',
        'consultation_fee',
        'medicines_total',
        'procedure_fee',
        'discount',
        'total_amount',
        'payment_method',
        'payment_status',
        'notes',
        'items',
    ];

    protected $casts = [
        'bill_date' => 'date',
        'consultation_fee' => 'decimal:2',
        'medicines_total' => 'decimal:2',
        'procedure_fee' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'items' => 'array',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }
}
