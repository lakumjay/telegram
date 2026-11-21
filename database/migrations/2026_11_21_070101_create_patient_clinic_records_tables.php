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
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->string('name')->index(); // e.g. Jay Lakum or જય લાકુમ
            $table->string('name_normalized')->nullable()->index(); // cleaned lowercase ascii / transliteration for 10ms lookup
            $table->string('name_gujarati')->nullable()->index(); // native gujarati script name
            $table->string('phone', 30)->nullable()->index();
            $table->integer('age')->nullable();
            $table->string('gender', 10)->nullable(); // Male, Female, Other
            $table->string('city', 100)->nullable()->index();
            $table->text('last_diagnosis')->nullable(); // e.g. "તાવ અને માથાનો દુખાવો" (Fever & Headache)
            $table->text('last_medicines')->nullable(); // e.g. "Paracetamol 650, Azithromycin 500"
            $table->text('last_summary')->nullable(); // Full preview for instant suggestion display
            $table->date('last_visit_date')->nullable()->index();
            $table->integer('total_visits')->default(1);
            $table->timestamps();

            // Compound index for instant multi-field lookup across millions of rows
            $table->index(['name', 'phone']);
            $table->index(['name_normalized', 'last_visit_date']);
        });

        Schema::create('patient_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->date('visit_date')->index();
            $table->string('photo_path'); // stored image of prescription/page
            $table->text('diagnosis')->nullable(); // e.g. તાવ, ઉધરસ, શરદી, પેટનો દુખાવો
            $table->text('medicines')->nullable(); // medications prescribed
            $table->text('symptoms')->nullable(); // symptoms reported
            $table->text('notes')->nullable(); // doctor handwritten remarks
            $table->longText('raw_ocr_text')->nullable(); // full OCR text
            $table->json('extracted_data')->nullable(); // structured AI parsed json
            $table->timestamps();

            $table->index(['patient_id', 'visit_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('patient_visits');
        Schema::dropIfExists('patients');
    }
};
