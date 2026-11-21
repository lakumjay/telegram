<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Clinics Table for Multi-Tenant Support
        Schema::create('clinics', function (Blueprint $table) {
            $table->id();
            $table->string('name')->index(); // e.g. શ્રીરામ ક્લિનિક / Shreeram Clinic
            $table->string('doctor_name')->default('Dr. Jay');
            $table->string('phone', 30)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('specialization')->default('General Physician');
            $table->decimal('default_consultation_fee', 10, 2)->default(300.00);
            $table->string('ai_assistant_name')->default('Alexa'); // custom voice assistant persona
            $table->string('voice_name')->default('Aoede'); // Gemini Live voice
            $table->timestamps();
        });

        // 2. Add clinic_id to patients and patient_visits for isolation
        Schema::table('patients', function (Blueprint $table) {
            $table->foreignId('clinic_id')->nullable()->default(1)->after('id')->index();
        });

        Schema::table('patient_visits', function (Blueprint $table) {
            $table->foreignId('clinic_id')->nullable()->default(1)->after('id')->index();
        });

        // 3. Medicines & Surgical Stock Inventory
        Schema::create('clinic_medicines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->default(1)->constrained('clinics')->cascadeOnDelete();
            $table->string('name')->index(); // e.g. Paracetamol 650
            $table->string('category')->default('Tablet'); // Tablet, Syrup, Injection, Ointment, Surgical
            $table->string('dosage')->nullable(); // 500mg, 100ml
            $table->integer('stock_quantity')->default(0); // Current in-hand units
            $table->integer('low_stock_alert')->default(20); // Alert threshold
            $table->decimal('unit_cost', 10, 2)->default(0.00); // Purchase price per unit
            $table->decimal('selling_price', 10, 2)->default(0.00); // Selling price per unit
            $table->string('batch_number')->nullable();
            $table->date('expiry_date')->nullable()->index();
            $table->timestamps();

            $table->index(['clinic_id', 'stock_quantity']);
        });

        // 4. Daily Patient OPD Bills & Clinic Income
        Schema::create('clinic_bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->default(1)->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();
            $table->string('bill_number')->unique();
            $table->date('bill_date')->index();
            $table->string('patient_name');
            $table->decimal('consultation_fee', 10, 2)->default(0.00);
            $table->decimal('medicines_total', 10, 2)->default(0.00);
            $table->decimal('procedure_fee', 10, 2)->default(0.00); // Dressing, Injection, ECG, etc.
            $table->decimal('discount', 10, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2)->default(0.00);
            $table->string('payment_method')->default('Cash'); // Cash, UPI/GPay, Card
            $table->string('payment_status')->default('Paid'); // Paid, Pending
            $table->text('notes')->nullable();
            $table->json('items')->nullable(); // Breakdown of medicine units dispensed
            $table->timestamps();

            $table->index(['clinic_id', 'bill_date']);
        });

        // 5. Daily Clinic Expenses (Rent, Staff, Electricity, Tea, Supplies)
        Schema::create('clinic_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->default(1)->constrained('clinics')->cascadeOnDelete();
            $table->date('expense_date')->index();
            $table->string('category')->index(); // Staff Salary, Clinic Rent, Electricity/Water, Tea/Snacks, Medical Supplies, Maintenance, Other
            $table->string('title'); // e.g. "કમ્પાઉન્ડર પગાર" or "લાઈટ બિલ"
            $table->decimal('amount', 10, 2)->default(0.00);
            $table->string('payment_mode')->default('Cash'); // Cash, Bank/UPI
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['clinic_id', 'expense_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_expenses');
        Schema::dropIfExists('clinic_bills');
        Schema::dropIfExists('clinic_medicines');

        Schema::table('patient_visits', function (Blueprint $table) {
            $table->dropColumn('clinic_id');
        });

        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn('clinic_id');
        });

        Schema::dropIfExists('clinics');
    }
};
