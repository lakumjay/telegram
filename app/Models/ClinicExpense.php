<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClinicExpense extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'expense_date',
        'category',
        'title',
        'amount',
        'payment_mode',
        'remarks',
    ];

    protected $casts = [
        'expense_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }
}
