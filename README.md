# 🤖 DocVoice AI - Telegram Document Assistant & Voice Bot (ધ્વનિ)

A high-performance, intelligent Document Assistant & Telegram Bot built with **Laravel 11 + React (Vite) + 100% Free AI APIs (Google Gemini Flash & Groq Whisper)**.

---

## 🌟 મુખ્ય ફીચર્સ (Key Features)

1. **📄 મલ્ટીપલ કંપની / વ્યક્તિ વાઇઝ ફોલ્ડર્સ:**
   - રાજેશ્વરી સોલાર, સનરાઇઝ ગ્રીન, ગ્રાહકોના આધારકાર્ડ વગેરે અલગ અલગ કંપની વાઇઝ વ્યવસ્થિત ગોઠવાયેલા.
2. **🔍 ડીપ OCR કન્ટેન્ટ સર્ચ (Deep Inside-Text Search):**
   - દસ્તાવેજની અંદરનું લખાણ વાંચીને સર્ચ કરે છે (દા.ત. `300 stemp apo je me test vyakti jode karyo`).
3. **👩‍💼 લાઇવ AI Voice Call (Female Voice - ધ્વનિ):**
   - કૉલ પર ઝડપી ગુજરાતી/અંગ્રેજીમાં વાત કરો -> AI ફિમેલ વૉઇસમાં કન્ફર્મ કરશે -> કૉલ કટ થતાં જ ફાઇલો મળી જશે.
4. **📦 ઓટોમેટિક ZIP ફાઇલ & કંપની મુજબ ગોઠવણી:**
   - મલ્ટીપલ કંપનીના ડોક્યુમેન્ટ્સ માંગો તો કંપની-વાઇઝ અલગ ફોલ્ડરવાળી રેડી ZIP ફાઇલ બની જશે.
5. **❓ કન્ફર્મેશન & Disambiguation:**
   - જો `GEDA document` ૨ કંપનીમાં હોય, તો બોટ પૂછશે કે કઈ કંપનીનું જોઈએ છે.
6. **🛡️ ૧૦૦% સિક્યુરિટી & Telegram Whitelist:**
   - માત્ર Authorized Telegram User IDs જ આ બોટ વાપરી શકે છે. બીજા માટે સીધો **Access Denied**.
7. **⚡ ૧૦૦% ફ્રી APIs:**
   - ગૂગલ જેમિની ફ્રી ટિયર, ગ્રોક વ્હિસ્પર અને ટેસેરેક્ટ/PDF પાર્સર.

---

## 🚀 પ્રોજેક્ટ શરૂ કરવાની રીત (How to Run)

### ૧. Laravel Backend Server શરૂ કરો:
```bash
php artisan serve
```
> ડેશબોર્ડ બ્રાઉઝરમાં ખોલો: `http://127.0.0.1:8000`

### ૨. (વૈકલ્પિક) React Dev Server (Hot Reload માટે):
```bash
npm run dev
```

### ૩. Telegram Bot શરૂ કરો (Local Polling Mode):
```bash
php artisan bot:poll
```

---

## 🧪 ટેસ્ટિંગ માટે તૈયાર એક્ઝામ્પલ્સ (Try in Voice Call or Chat):

| બોલો અથવા લખો | સિસ્ટમ શું કરશે |
| :--- | :--- |
| `rajeshwari solar pancard and sunrise green pancard apo` | બંને કંપનીના પાનકાર્ડ શોધીને કન્ફર્મ કરશે અને ZIP આપશે |
| `300 stemp apo je me test vyakti jode kariyo ae` | અંદરથી વાંચીને ₹300 સ્ટેમ્પ પેપર (ટેસ્ટ વ્યક્તિ કરાર) આપશે |
| `geda document apo` | ૨ કંપનીમાં ગેડા હોવાથી કંપની પૂછશે |
| `ના / ખોટી ફાઇલ છે` | AI કહેશે: "ઓકે, શાંતિથી વિચારીને કહો કઈ ફાઇલ જોઈએ છે" |
| `/zip all` | બધા ડોક્યુમેન્ટ્સની કંપની-વાઇઝ Master ZIP બનાવી દેશે |
| `/call` | લાઇવ AI Voice Call ઇન્ટરફેસ ખોલશે |
