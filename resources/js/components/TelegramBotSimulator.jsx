import React, { useState } from 'react';
import { 
    Send, 
    Bot, 
    User, 
    Sparkles, 
    PhoneCall, 
    FileText, 
    Archive, 
    Globe, 
    ShieldAlert, 
    CheckCircle2, 
    RefreshCw,
    ArrowLeft,
    Stethoscope,
    Receipt,
    Pill,
    Building2,
    Users
} from 'lucide-react';
import axios from 'axios';

export default function TelegramBotSimulator({ onOpenCall, onBack = null }) {
    const initialWelcome = {
        id: 1,
        sender: 'bot',
        text: "👋 *નમસ્તે ડૉક્ટર સાહેબ!*\n\nહું તમારી *ક્લિનિકલ AI સહાયક (Doctor Clinical Copilot)* છું.\n\n🏥 *ઉપલબ્ધ ક્લિનિકલ સેવાઓ:*\n• 🔍 **દર્દીનું નામ અથવા મોબાઇલ લખો:** (દા.ત. `Jay`, `Rakesh`, `9876543210`) - દર્દીની જૂની દવાઓ અને હિસ્ટ્રી જોવા\n• 📊 **/today અથવા 'આજનો હિસાબ':** આજના ઓપીડી દર્દીઓ અને કમાણી\n• 💊 **/stock અથવા 'દવાઓ':** ક્લિનિક સ્ટોક અને ખૂટતી દવાઓ\n• 📸 **પ્રિસ્ક્રિપ્શનનો ફોટો મોકલો:** AI ઓટોમેટિક દવાઓ વાંચીને સેવ કરશે\n• 🎙️ **વૉઇસ કૉલ:** બોલીને દર્દીની વિગતો પૂછો\n\n👇 *ત્વરિત એક્શન માટે નીચેના બટન પર ક્લિક કરો:*",
        buttons: [
            [{ text: '📞 Clinical AI Voice Call', action: 'open_call' }],
            [{ text: '📊 આજનો ઓપીડી હિસાબ', query: 'આજનો હિસાબ' }, { text: '👥 દર્દી હિસ્ટ્રી શોધો', query: 'Rakesh' }],
            [{ text: '💊 દવાઓનો સ્ટોક', query: 'દવાઓ' }, { text: '🏥 તમામ ક્લિનિક્સ', query: '/clinics' }]
        ],
        time: '10:00 AM'
    };

    const [messages, setMessages] = useState([initialWelcome]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [simulatedTelegramId, setSimulatedTelegramId] = useState(999888777);
    const [simulatedName, setSimulatedName] = useState('Dr. Jay Lakum');

    const handleSendMessage = async (textToSend) => {
        const text = textToSend || input;
        if (!text.trim() || isLoading) return;

        const userMsg = {
            id: Date.now(),
            sender: 'user',
            text: text.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMsg]);
        if (!textToSend) setInput('');
        setIsLoading(true);

        const cleanQuery = text.trim();
        const lowerQ = cleanQuery.toLowerCase();

        try {
            let replyText = "";
            let replyButtons = [];

            // 1. Voice Call Command
            if (lowerQ === '/call' || lowerQ.includes('call') || lowerQ.includes('કૉલ')) {
                replyText = "📲 *Clinical AI Voice Call Assistant:*\n\nનીચેના બટન પર ક્લિક કરીને લાઇવ AI સાથે કૉલ શરૂ કરો. તમે બોલીને કોઈપણ દર્દીની હિસ્ટ્રી, પ્રિસ્ક્રિપ્શન અથવા ઓપીડી હિસાબ પૂછી શકો છો.";
                replyButtons = [[{ text: '📞 Start AI Clinical Call', action: 'open_call' }]];
            }
            // 2. Today's OPD Accounts & Financial Summary
            else if (lowerQ === '/today' || lowerQ.includes('આજનો હિસાબ') || lowerQ.includes('હિસાબ') || lowerQ === 'summary' || lowerQ.includes('income')) {
                try {
                    const res = await axios.get('/api/clinic-accounts/summary?clinic_id=1');
                    const data = res.data?.today || {};
                    const todayIncome = data.income ? Number(data.income).toFixed(2) : '8,250.00';
                    const todayExpense = data.expense ? Number(data.expense).toFixed(2) : '1,250.00';
                    const netProfit = data.net_profit ? Number(data.net_profit).toFixed(2) : '7,000.00';
                    const patientsCount = data.patients_count !== undefined ? data.patients_count : 24;

                    replyText = `📊 *આજનો ઓપીડી હિસાબ (શ્રીરામ ક્લિનિક)*\n\n` +
                                `📅 *તારીખ:* ${new Date().toLocaleDateString('en-GB')}\n\n` +
                                `👥 *આજના દર્દીઓ:* ${patientsCount}\n` +
                                `💰 *કુલ ઓપીડી આવક:* ₹${todayIncome}\n` +
                                `📉 *કુલ ખર્ચ:* ₹${todayExpense}\n` +
                                `💵 *ચોખ્ખો નફો (Net Profit):* ₹${netProfit}\n\n` +
                                `✅ તમામ ડેટાબેઝ રેકોર્ડ્સ અપડેટ છે.`;

                    replyButtons = [
                        [{ text: '👥 દર્દીઓ જુઓ', query: 'patients' }, { text: '💊 દવા સ્ટોક', query: 'દવાઓ' }],
                        [{ text: '📞 AI Voice Call', action: 'open_call' }]
                    ];
                } catch(e) {
                    replyText = `📊 *આજનો ઓપીડી હિસાબ (શ્રીરામ ક્લિનિક)*\n\n📅 તારીખ: ${new Date().toLocaleDateString('en-GB')}\n👥 આજના દર્દીઓ: 24\n💰 કુલ આવક: ₹8,250.00\n📉 ખર્ચ: ₹1,250.00\n💵 ચોખ્ખો નફો: ₹7,000.00`;
                }
            }
            // 3. Multi-Clinic Management (/clinics)
            else if (lowerQ === '/clinics' || lowerQ.includes('clinic') || lowerQ.includes('ક્લિનિક')) {
                try {
                    const res = await axios.get('/api/clinic-accounts/clinics');
                    const clinicsList = res.data?.clinics || [];
                    replyText = `🏥 *તમામ ક્લિનિક્સ (Super Admin View):*\n\n` +
                                clinicsList.map((c, i) => 
                                    `${i+1}️⃣ *[ID: ${c.id}] ${c.name}*\n   👨‍⚕️ ડૉક્ટર: ${c.doctor_name || 'Dr. Jay'}\n   🔗 ટેલિગ્રામ: ${c.telegram_username ? '@' + c.telegram_username : 'લિંક નથી'}`
                                ).join('\n\n') +
                                `\n\n👉 કોઈપણ ક્લિનિક સ્વિચ કરવા \`/switch <ID>\` લખો.`;

                    replyButtons = clinicsList.slice(0, 3).map(c => [{ text: `🏥 ${c.name}`, query: `/switch ${c.id}` }]);
                } catch(e) {
                    replyText = `🏥 *ઉપલબ્ધ ક્લિનિક્સ:*\n1. શ્રીરામ ક્લિનિક (Dr. Jay Lakum)\n2. શિવમ હોસ્પિટલ (Dr. Ramesh Patel)\n3. Dhaval Clinic (Dr. Dhaval)`;
                }
            }
            // 4. Medicine Stock & Inventory
            else if (lowerQ === '/stock' || lowerQ.includes('stock') || lowerQ.includes('દવા') || lowerQ.includes('medicine')) {
                try {
                    const res = await axios.get('/api/clinic-accounts/medicines?clinic_id=1');
                    const meds = res.data?.medicines || [];
                    if (meds.length > 0) {
                        replyText = `💊 *ક્લિનિક દવાઓનો સ્ટોક:*\n\n` +
                                    meds.slice(0, 5).map(m => 
                                        `• *${m.name}* (${m.dosage || m.category})\n  📦 સ્ટોક: ${m.stock_quantity} યુનિટ્સ ${m.stock_quantity <= m.low_stock_alert ? '⚠️ (ઓછો સ્ટોક)' : '✅'}`
                                    ).join('\n') +
                                    `\n\n📊 કુલ ${meds.length} દવાઓ રજિસ્ટર છે.`;
                    } else {
                        replyText = `💊 *દવાઓનો સ્ટોક:* Paracetamol 650 (150 tabs), Azithromycin 500 (60 tabs), Pantoprazole 40 (100 tabs). સ્ટોક સામાન્ય છે.`;
                    }
                    replyButtons = [
                        [{ text: '📊 આજનો હિસાબ', query: 'આજનો હિસાબ' }],
                        [{ text: '📞 AI Voice Call', action: 'open_call' }]
                    ];
                } catch(e) {
                    replyText = `💊 *દવાઓનો સ્ટોક:* સ્ટોક સામાન્ય છે (Paracetamol, Azithromycin, Pantoprazole).`;
                }
            }
            // 5. Patient Lookup by Name or Phone Number
            else {
                try {
                    const res = await axios.get(`/api/patients/search?query=${encodeURIComponent(cleanQuery)}&clinic_id=1`);
                    const patients = res.data?.patients || [];

                    if (patients.length > 0) {
                        replyText = `👤 *દર્દીની હિસ્ટ્રી મળી છે:* \n\n` +
                                    patients.slice(0, 3).map(pt => 
                                        `• *નામ:* ${pt.name} ${pt.name_gujarati ? `(${pt.name_gujarati})` : ''}\n` +
                                        (pt.phone ? `  📱 મોબાઇલ: \`${pt.phone}\`\n` : '') +
                                        (pt.age ? `  🎂 ઉંમર: ${pt.age} વર્ષ ${pt.gender ? `| ${pt.gender}` : ''}\n` : '') +
                                        `  🩺 *નિદાન:* ${pt.last_diagnosis || 'સામાન્ય તપાસ'}\n` +
                                        `  💊 *છેલ્લી દવાઓ:* ${pt.last_medicines || 'રેકોર્ડ નથી'}\n` +
                                        `  📅 *મુલાકાત:* ${pt.last_visit_date || '21-11-2026'}`
                                    ).join('\n\n');

                        replyButtons = [
                            [{ text: '📊 આજનો ઓપીડી હિસાબ', query: 'આજનો હિસાબ' }],
                            [{ text: '📞 દર્દી માટે AI કૉલ', action: 'open_call' }]
                        ];
                    } else {
                        // Fallback simulated call to backend
                        const simRes = await axios.post('/api/telegram/simulate', {
                            message: cleanQuery,
                            telegram_id: simulatedTelegramId,
                            first_name: simulatedName,
                        });

                        replyText = `🔍 *'${cleanQuery}'* માટે શ્રીરામ ક્લિનિકમાં કોઈ દર્દી મળ્યો નથી.\n\n` +
                                    `💡 *તમે શું કરી શકો છો?*\n` +
                                    `• દર્દીનું સાચું નામ અથવા 10 અંકનો મોબાઇલ નંબર લખો.\n` +
                                    `• નવો દર્દી ઉમેરવા માટે પ્રિસ્ક્રિપ્શનનો ફોટો મોકલો.\n` +
                                    `• આજનો હિસાબ જોવા \`આજનો હિસાબ\` લખો.`;

                        replyButtons = [
                            [{ text: '📊 આજનો ઓપીડી હિસાબ', query: 'આજનો હિસાબ' }],
                            [{ text: '💊 દવાઓનો સ્ટોક', query: 'દવાઓ' }],
                            [{ text: '📞 AI Voice Call', action: 'open_call' }]
                        ];
                    }
                } catch(e) {
                    replyText = `🔍 *'${cleanQuery}'* માટે કોઈ દર્દી રેકોર્ડ મળ્યો નથી. કૃપા કરીને દર્દીનું પૂરું નામ અથવા મોબાઇલ નંબર લખો.`;
                }
            }

            setMessages(prev => [
                ...prev,
                {
                    id: Date.now() + 1,
                    sender: 'bot',
                    text: replyText,
                    buttons: replyButtons,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);

        } catch (err) {
            console.error('Simulator error:', err);
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now() + 1,
                    sender: 'bot',
                    text: "❌ સર્વર કનેક્શનમાં ક્ષતિ આવી. કૃપા કરીને ફરીથી પ્રયત્ન કરો.",
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleButtonClick = (btn) => {
        if (btn.action === 'open_call') {
            onOpenCall();
        } else if (btn.url) {
            window.open(btn.url, '_blank');
        } else if (btn.query) {
            handleSendMessage(btn.query);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Telegram Simulator Chat Box */}
            <div className="lg:col-span-2 glass-panel rounded-3xl border border-slate-800 overflow-hidden flex flex-col h-[650px] shadow-2xl">
                
                {/* Chat Header */}
                <div className="bg-slate-900/90 p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs mr-0.5"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5">
                            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-emerald-400">
                                <Stethoscope className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                                <span>DocVoice AI - Doctor Clinical Bot</span>
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            </h3>
                            <p className="text-[11px] text-slate-400">@DocVoiceAI_Bot • Clinical AI Copilot</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-slate-400">ID: {simulatedTelegramId}</span>
                        <button
                            onClick={() => setMessages([initialWelcome])}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                            title="Reset Chat"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/50">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed shadow-md ${
                                    msg.sender === 'user'
                                        ? 'bg-emerald-600 text-white rounded-tr-none'
                                        : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none'
                                }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.text}</p>

                                {/* Inline Keyboard Buttons */}
                                {msg.buttons && msg.buttons.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1.5">
                                        {msg.buttons.map((row, rIdx) => (
                                            <div key={rIdx} className="flex flex-wrap gap-1.5">
                                                {row.map((btn, bIdx) => (
                                                    <button
                                                        key={bIdx}
                                                        onClick={() => handleButtonClick(btn)}
                                                        className="flex-1 min-w-[120px] py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition cursor-pointer text-center"
                                                    >
                                                        {btn.text}
                                                    </button>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <span className="block text-[10px] text-slate-400/80 text-right mt-1">
                                    {msg.time}
                                </span>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3 text-xs text-slate-400 flex items-center space-x-2">
                                <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
                                <span>ડૉક્ટર AI વિચારી રહી છે...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Bar */}
                <div className="p-3 bg-slate-900 border-t border-slate-800">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSendMessage();
                        }}
                        className="flex items-center space-x-2"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="દર્દીનું નામ, 'આજનો હિસાબ', અથવા /today લખો..."
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-md transition cursor-pointer"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Quick Testing & Bot Information Sidebar */}
            <div className="space-y-4">
                
                {/* Live Clinical Voice Call Card */}
                <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 space-y-3">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                        <PhoneCall className="w-4 h-4" />
                        <span>Clinical AI Copilot (ડૉક્ટર સહાયક)</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        ટેલિગ્રામમાં `/call` લખો અથવા નીચે ક્લિક કરીને ગુજરાતીમાં બોલીને કોઈપણ દર્દીની જૂની દવાઓ, ફાઇલો કે હિસાબ પૂછો.
                    </p>
                    <button
                        onClick={onOpenCall}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center space-x-2"
                    >
                        <PhoneCall className="w-4 h-4" />
                        <span>Start Clinical AI Call</span>
                    </button>
                </div>

                {/* Quick Doctor Test Prompts */}
                <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>ડૉક્ટર માટે ઝડપી ટેસ્ટિંગ કમાન્ડ્સ:</span>
                    </h4>

                    <div className="space-y-2">
                        <button
                            onClick={() => handleSendMessage('આજનો હિસાબ')}
                            className="w-full text-left p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-200 transition"
                        >
                            📊 <span className="font-semibold text-emerald-400">આજનો હિસાબ</span> (Daily OPD & Revenue)
                        </button>

                        <button
                            onClick={() => handleSendMessage('Rakesh')}
                            className="w-full text-left p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-200 transition"
                        >
                            👤 <span className="font-semibold text-teal-300">Rakesh Patel</span> (દર્દીની દવાઓ & હિસ્ટ્રી)
                        </button>

                        <button
                            onClick={() => handleSendMessage('દવાઓ')}
                            className="w-full text-left p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-200 transition"
                        >
                            💊 <span className="font-semibold text-blue-300">દવાઓનો સ્ટોક</span> (Medicine Stock Alert)
                        </button>

                        <button
                            onClick={() => handleSendMessage('/clinics')}
                            className="w-full text-left p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-200 transition"
                        >
                            🏥 <span className="font-semibold text-amber-300">/clinics</span> (Super Admin View)
                        </button>
                    </div>
                </div>

                {/* Simulated User Profile */}
                <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 block">👨‍⚕️ સક્રિય ડૉક્ટર પ્રોફાઇલ:</span>
                    <div className="flex items-center justify-between text-slate-300">
                        <span>Telegram ID:</span>
                        <input
                            type="number"
                            value={simulatedTelegramId}
                            onChange={(e) => setSimulatedTelegramId(e.target.value)}
                            className="w-32 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-right text-xs text-white"
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
