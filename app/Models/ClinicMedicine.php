<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClinicMedicine extends Model
{
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'name',
        'category',
        'dosage',
        'stock_quantity',
        'low_stock_alert',
        'unit_cost',
        'selling_price',
        'batch_number',
        'expiry_date',
    ];

    protected $casts = [
        'stock_quantity' => 'integer',
        'low_stock_alert' => 'integer',
        'unit_cost' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'expiry_date' => 'date',
    ];

    public function clinic()
    {
        return $this->belongsTo(Clinic::class);
    }
}
