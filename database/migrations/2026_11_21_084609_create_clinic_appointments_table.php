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
        Schema::create('clinic_appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->default(1)->constrained('clinics')->cascadeOnDelete();
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();
            $table->string('patient_name');
            $table->string('phone', 30)->nullable();
            $table->date('appointment_date')->index();
            $table->string('appointment_time', 20)->default('10:00 AM');
            $table->string('status')->default('Confirmed'); // Pending, Confirmed, Completed, Cancelled
            $table->string('reason')->default('General Checkup');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['clinic_id', 'appointment_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_appointments');
    }
};
