<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Document;
use App\Models\Folder;
use App\Models\SystemSetting;
use App\Models\TelegramUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Setup Default System Settings
        SystemSetting::set('whitelist_enabled', true, 'boolean');
        SystemSetting::set('master_security_pin', '123456', 'string');
        SystemSetting::set('bot_username', 'DocVoiceAI_Bot', 'string');

        // 2. Setup Default Whitelisted Admin User
        TelegramUser::updateOrCreate(
            ['telegram_id' => 999888777],
            [
                'first_name' => 'Jay',
                'last_name' => 'Patel',
                'username' => 'jay_patel',
                'phone_number' => '+91 9876543210',
                'is_authorized' => true,
                'role' => 'admin',
                'access_pin' => '123456',
            ]
        );

        // 3. Company 1: Rajeshwari Solar
        $rajeshwari = Company::updateOrCreate(
            ['slug' => 'rajeshwari-solar'],
            [
                'name' => 'Rajeshwari Solar',
                'type' => 'firm',
                'owner_name' => 'Rajeshbhai Patel',
                'pan_number' => 'ABCDE1234F',
                'gst_number' => '24ABCDE1234F1Z5',
                'aliases' => ['રાજેશ્વરી', 'રાજેશ્વરી સોલાર', 'rajeshwari', 'rajeshwari solar', 'rajeshvari solar'],
                'description' => 'Solar EPC & Rooftop Installation Services Gujarat',
            ]
        );

        $fKycRaj = Folder::create(['company_id' => $rajeshwari->id, 'name' => 'KYC & Identity', 'slug' => 'kyc', 'color' => '#3b82f6']);
        $fTaxRaj = Folder::create(['company_id' => $rajeshwari->id, 'name' => 'Tax & GST', 'slug' => 'tax-gst', 'color' => '#10b981']);
        $fLegalRaj = Folder::create(['company_id' => $rajeshwari->id, 'name' => 'Legal Stamp Papers', 'slug' => 'legal-stamps', 'color' => '#f59e0b']);
        $fGovtRaj = Folder::create(['company_id' => $rajeshwari->id, 'name' => 'Government & GEDA', 'slug' => 'geda-govt', 'color' => '#8b5cf6']);

        // Documents for Rajeshwari Solar
        Document::create([
            'company_id' => $rajeshwari->id,
            'folder_id' => $fKycRaj->id,
            'title' => 'Rajeshwari Solar PAN Card',
            'doc_type' => 'pan',
            'original_filename' => 'rajeshwari_solar_pan.pdf',
            'file_path' => 'documents/demo_rajeshwari_pan.pdf',
            'file_size' => 245000,
            'mime_type' => 'application/pdf',
            'ocr_status' => 'completed',
            'ocr_text' => "INCOME TAX DEPARTMENT - GOVT OF INDIA\nPermanent Account Number Card\nName: RAJESHWARI SOLAR\nFather/Prop: RAJESH PATEL\nPAN: ABCDE1234F\nDate of Incorporation: 12/04/2018\nAuthentic Verified Document.",
            'search_keywords' => 'rajeshwari solar pan pancard પાનકાર્ડ રાજેશ્વરી પાન ABCDE1234F',
        ]);

        Document::create([
            'company_id' => $rajeshwari->id,
            'folder_id' => $fTaxRaj->id,
            'title' => 'Rajeshwari Solar GST Certificate',
            'doc_type' => 'gst',
            'original_filename' => 'rajeshwari_gst_reg.pdf',
            'file_path' => 'documents/demo_rajeshwari_gst.pdf',
            'file_size' => 412000,
            'mime_type' => 'application/pdf',
            'ocr_status' => 'completed',
            'ocr_text' => "GOVERNMENT OF INDIA\nFORM GST REG-06\nREGISTRATION CERTIFICATE\nRegistration Number: 24ABCDE1234F1Z5\nLegal Name: RAJESHWARI SOLAR\nTrade Name: RAJESHWARI SOLAR\nPrincipal Place of Business: Shop 14, Galaxy Complex, Ahmedabad, Gujarat - 380015\nDate of Liability: 01/07/2017",
            'search_keywords' => 'rajeshwari solar gst gstin જીએસટી 24ABCDE1234F1Z5 ahmedabad',
        ]);

        Document::create([
            'company_id' => $rajeshwari->id,
            'folder_id' => $fTaxRaj->id,
            'title' => 'Rajeshwari Solar Udyam Registration',
            'doc_type' => 'udyam',
            'original_filename' => 'rajeshwari_udyam_msme.pdf',
            'file_path' => 'documents/demo_rajeshwari_udyam.pdf',
            'file_size' => 310000,
            'mime_type' => 'application/pdf',
            'ocr_status' => 'completed',
            'ocr_text' => "MINISTRY OF MICRO, SMALL & MEDIUM ENTERPRISES\nUDYAM REGISTRATION CERTIFICATE\nUDYAM-GJ-01-0098765\nNAME OF ENTERPRISE: RAJESHWARI SOLAR\nTYPE OF ENTERPRISE: MICRO\nMAJOR ACTIVITY: SERVICES / SOLAR INSTALLATIONS",
            'search_keywords' => 'rajeshwari solar udyam msme ઉદ્યમ ઉદ્યોગ આધાર UDYAM-GJ-01-0098765',
        ]);

        Document::create([
            'company_id' => $rajeshwari->id,
            'folder_id' => $fLegalRaj->id,
            'title' => '₹300 Stamp Paper Agreement with Test Vyakti',
            'doc_type' => 'stamp',
            'stamp_value' => 300.00,
            'parties' => ['Rajeshwari Solar', 'Test Vyakti', 'ટેસ્ટ વ્યક્તિ'],
            'original_filename' => 'stamp_300_test_vyakti_agreement.pdf',
            'file_path' => 'documents/demo_stamp_300_test.pdf',
            'file_size' => 580000,
            'mime_type' => 'application/pdf',
            'ocr_status' => 'completed',
            'ocr_text' => "ગુજરાત સરકાર ઈ-સ્ટેમ્પ (E-STAMP GUJARAT)\nસર્ટિફિકેટ નંબર: IN-GJ98234872394H\nસ્ટેમ્પ ડ્યુટી રકમ: ₹ 300/- (રૂપિયા ત્રણસો પુરા)\nપ્રથમ પક્ષકાર: મેસર્સ રાજેશ્વરી સોલાર (RAJESHWARI SOLAR)\nદ્વિતીય પક્ષકાર: શ્રી ટેસ્ટ વ્યક્તિ (TEST VYAKTI)\nબાંયધરી કરાર: આથી આ કરાર દ્વારા રાજેશ્વરી સોલાર અને ટેસ્ટ વ્યક્તિ વચ્ચે સોલાર પ્રોજેક્ટ માટે રૂ. 300 ના સ્ટેમ્પ પેપર ઉપર સહમતી થયેલ છે.",
            'search_keywords' => '300 stamp 300 stemp 300 સ્ટેમ્પ ટેસ્ટ વ્યક્તિ test vyakti rajeshwari agreement કરાર',
        ]);

        Document::create([
            'company_id' => $rajeshwari->id,
            'folder_id' => $fGovtRaj->id,
            'title' => 'Rajeshwari Solar GEDA Approval Document',
            'doc_type' => 'geda',
            'original_filename' => 'rajeshwari_geda_approval.pdf',
            'file_path' => 'documents/demo_rajeshwari_geda.pdf',
            'file_size' => 380000,
            'mime_type' => 'application/pdf',
            'ocr_status' => 'completed',
            'ocr_text' => "GUJARAT ENERGY DEVELOPMENT AGENCY (GEDA)\nBlock No. 11/12, Udyog Bhavan, Sector-11, Gandhinagar - 382017\nChannel Partner Empanelment Certificate\nApproved Firm: RAJESHWARI SOLAR\nEmpanelment No: GEDA/SOLAR/2024/GJ-8819\nScope: Grid Connected Rooftop Solar Power Systems in Gujarat",
            'search_keywords' => 'rajeshwari geda document ગેડા GEDA approval rajeshwari solar gandhinagar',
        ]);

        // 4. Company 2: Sunrise Green
        $sunrise = Company::updateOrCreate(
            ['slug' => 'sunrise-green'],
            [
                'name' => 'Sunrise Green',
                'type' => 'company',
                'owner_name' => 'Amitbhai Shah',
                'pan_number' => 'XYZPQ9876K',
                'gst_number' => '24XYZPQ9876K1Z8',
                'aliases' => ['સનરાઈઝ', 'સનરાઈઝ ગ્રીન', 'sunrise', 'sunrise green'],
                'description' => 'Green Energy Solutions & Solar Distribution',
            ]
        );

        $fKycSun = Folder::create(['company_id' => $sunrise->id, 'name' => 'KYC & Identity', 'slug' => 'kyc-sun', 'color' => '#3b82f6']);
        $fTaxSun = Folder::create(['company_id' => $sunrise->id, 'name' => 'Tax & GST', 'slug' => 'tax-sun', 'color' => '#10b981']);
        $fGovtSun = Folder::create(['company_id' => $sunrise->id, 'name' => 'GEDA & Govt Approvals', 'slug' => 'geda-sun', 'color' => '#8b5cf6']);

        Document::create([
            'company_id' => $sunrise->id,
            'folder_id' => $fKycSun->id,
            'title' => 'Sunrise Green PAN Card',
            'doc_type' => 'pan',
            'original_filename' => 'sunrise_green_pancard.pdf',
            'file_path' => 'documents/demo_sunrise_pan.pdf',
            'file_size' => 256000,
            'mime_type' => 'application/pdf',
            'ocr_status' => 'completed',
            'ocr_text' => "INCOME TAX DEPARTMENT - GOVT OF INDIA\nPAN: XYZPQ9876K\nName: SUNRISE GREEN PRIVATE LIMITED\nDate of Incorporation: 05/08/2020\nTaxpayer Category: Company",
            'search_keywords' => 'sunrise green pan pancard પાનકાર્ડ સનરાઈઝ ગ્રીન પાન XYZPQ9876K',
        ]);

        Document::create([
            'company_id' => $sunrise->id,
            'folder_id' => $fTaxSun->id,
            'title' => 'Sunrise Green GST Certificate',
            'doc_type' => 'gst',
            'original_filename' => 'sunrise_green_gst.pdf',
            'file_path' => 'documents/demo_sunrise_gst.pdf',
            'file_size' => 420000,
            'mime_type' => 'application/pdf',
            'ocr_status' => 'completed',
            'ocr_text' => "GOVERNMENT OF INDIA\nGST REG-06 CERTIFICATE\nGSTIN: 24XYZPQ9876K1Z8\nLegal Name: SUNRISE GREEN PRIVATE LIMITED\nTrade Name: SUNRISE GREEN\nRegistered Office: 402, Green Avenue, Surat, Gujarat - 395007",
            'search_keywords' => 'sunrise green gst gstin જીએસટી સનરાઈઝ સુરત 24XYZPQ9876K1Z8',
        ]);

        Document::create([
            'company_id' => $sunrise->id,
            'folder_id' => $fGovtSun->id,
            'title' => 'Sunrise Green GEDA Empanelment Certificate',
            'doc_type' => 'geda',
            'original_filename' => 'sunrise_geda_certificate.pdf',
            'file_path' => 'documents/demo_sunrise_geda.pdf',
            'file_size' => 390000,
            'mime_type' => 'application/pdf',
            'ocr_status' => 'completed',
            'ocr_text' => "GUJARAT ENERGY DEVELOPMENT AGENCY (GEDA)\nCertificate of Solar Vendor Accreditation\nAuthorized Vendor: SUNRISE GREEN PRIVATE LIMITED\nRegistration ID: GEDA/SURAT/2024/SN-5542\nValidity: 31/03/2027",
            'search_keywords' => 'sunrise green geda document ગેડા GEDA solar certificate surat',
        ]);

        // 5. Sample Person / Aadhaar Card Pool
        $personComp = Company::updateOrCreate(
            ['slug' => 'aadhaar-pool'],
            [
                'name' => 'Aadhaar Database Pool',
                'type' => 'person',
                'description' => 'Customer KYC & Aadhaar Records',
            ]
        );
        $fAadhaar = Folder::create(['company_id' => $personComp->id, 'name' => 'Aadhaar Cards', 'slug' => 'aadhaar-docs', 'color' => '#ec4899']);

        Document::create([
            'company_id' => $personComp->id,
            'folder_id' => $fAadhaar->id,
            'title' => 'Aadhaar Card - Ramesh Patel',
            'doc_type' => 'aadhaar',
            'parties' => ['Ramesh Patel', 'રમેશ પટેલ'],
            'original_filename' => 'ramesh_patel_aadhaar.pdf',
            'file_path' => 'documents/demo_ramesh_aadhaar.pdf',
            'file_size' => 190000,
            'mime_type' => 'application/pdf',
            'ocr_status' => 'completed',
            'ocr_text' => "GOVERNMENT OF INDIA - UNIQUE IDENTIFICATION AUTHORITY OF INDIA\nName: RAMESHBHAI PATEL (રમેશભાઈ પટેલ)\nDOB: 15/06/1985\nGender: MALE / પુરૂષ\nAadhaar No: 5412 8841 9920\nAddress: 12, Sardar Society, Mehsana, Gujarat - 384001\nમેરા આધાર, મેરી પહેચાન",
            'search_keywords' => 'aadhaar aadhar adhar આધારકાર્ડ ramesh patel રમેશ પટેલ 5412 8841 9920 mehsana',
        ]);
    }
}
