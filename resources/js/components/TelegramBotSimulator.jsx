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
    RefreshCw 
} from 'lucide-react';
import axios from 'axios';

export default function TelegramBotSimulator({ onOpenCall }) {
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'bot',
            text: "👋 *Hello!*\n\nI am your *AI Document Assistant (Alexa)*.\n\n📁 Type any document name or details (e.g. `Rajeshwari PAN`, `300 stamp test`, `geda document`, `/zip Rajeshwari Solar`)\n\n👇 Or click the button below to start a live voice call:",
            buttons: [
                [{ text: '📞 Voice Call AI Assistant (Live Call)', action: 'open_call' }],
                [{ text: '📂 View All Documents', query: 'all' }, { text: '📦 Create ZIP File', query: '/zip all' }]
            ],
            time: '10:00 AM'
        }
    ]);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [simulatedTelegramId, setSimulatedTelegramId] = useState(999888777);
    const [simulatedName, setSimulatedName] = useState('Jay Admin');

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

        try {
            const res = await axios.post('/api/telegram/simulate', {
                message: text.trim(),
                telegram_id: simulatedTelegramId,
                first_name: simulatedName,
            });

            // If we are testing locally without real Telegram server response, parse simulated action
            const botResult = res.data.bot_result;
            
            // Format bot reply based on search
            const searchRes = await axios.get('/api/documents', { params: { search: text.trim() } });
            
            let replyText = "";
            let replyButtons = [];

            if (text.trim() === '/call') {
                replyText = "📲 *AI Voice Call Assistant:*\n\nClick the button below to start live voice call. You can speak to search, query, and request any document.";
                replyButtons = [[{ text: '📞 Start AI Voice Call', action: 'open_call' }]];
            } else if (text.trim().startsWith('/zip')) {
                const zipQuery = text.trim().replace('/zip', '').trim() || 'all';
                const zipDocs = searchRes.data.data;
                if (zipDocs.length > 0) {
                    const zipCreation = await axios.post('/api/zip/create', {
                        document_ids: zipDocs.map(d => d.id),
                        mode: 'single_master_zip'
                    });
                    replyText = `📦 *ZIP Bundle Ready!*\n\n📁 Total Files: ${zipCreation.data.documents_count}\n📊 Size: ${zipCreation.data.file_size_formatted}\n\nYou can download or forward this ZIP file.`;
                    replyButtons = [[{ text: '⬇️ Download ZIP File', url: zipCreation.data.download_url }]];
                } else {
                    replyText = `❌ No documents found for '${zipQuery}'.`;
                }
            } else if (searchRes.data.disambiguation_required) {
                const dis = searchRes.data.disambiguation_data;
                replyText = `❓ *Confirmation Required:*\nYou requested \`${dis.doc_type}\`, but this document is available across multiple companies. Which company do you need?`;
                replyButtons = dis.companies.map(c => [{ text: `🏢 ${c.name}`, query: c.query }]);
            } else if (searchRes.data.data.length > 0) {
                const docs = searchRes.data.data;
                replyText = `✅ *Found ${docs.length} documents:*\n\n` + 
                    docs.map((d, i) => `📄 *${d.title}*\n🏢 Company: ${d.company?.name || 'General'}\n🏷️ Type: ${d.doc_type?.toUpperCase()} ${d.stamp_value ? `(₹${d.stamp_value} Stamp)` : ''}`).join('\n\n');
                
                replyButtons = [
                    [{ text: '📦 Create ZIP of all files', query: `/zip ${text.trim()}` }],
                    [{ text: '📞 Open AI Voice Call', action: 'open_call' }]
                ];
            } else {
                replyText = `🔍 No documents found for *'${text.trim()}'*.\n\n💡 *Did you mean one of these?*`;
                replyButtons = (searchRes.data.suggestions || []).slice(0, 4).map(s => [{ text: s.title, query: s.query }]);
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
                    text: "❌ Server error occurred.",
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
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 p-0.5">
                            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-cyan-400">
                                <Bot className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                                <span>DocVoice AI Bot</span>
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            </h3>
                            <p className="text-[11px] text-slate-400">@DocVoiceAI_Bot • bot</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-slate-400">ID: {simulatedTelegramId}</span>
                        <button
                            onClick={() => setMessages([messages[0]])}
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
                                        ? 'bg-blue-600 text-white rounded-tr-none'
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
                                                        className="flex-1 min-w-[120px] py-1.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold transition cursor-pointer text-center"
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
                                <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
                                <span>Bot is typing...</span>
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
                            placeholder="Type a message... (e.g. /call, Rajeshwari PAN, 300 stamp, /zip all)"
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl shadow-md transition cursor-pointer"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Quick Testing & Bot Information Sidebar */}
            <div className="space-y-4">
                
                {/* Live Voice Call Card */}
                <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 space-y-3">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                        <PhoneCall className="w-4 h-4" />
                        <span>AI Voice Call Agent (Alexa)</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        Send `/call` command in Telegram or click below to launch the React Mini App for seamless voice interaction.
                    </p>
                    <button
                        onClick={onOpenCall}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center space-x-2"
                    >
                        <PhoneCall className="w-4 h-4" />
                        <span>Start Live Voice Call</span>
                    </button>
                </div>

                {/* Quick Test Chips */}
                <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        <span>Quick Test Prompts:</span>
                    </h4>

                    <div className="space-y-2">
                        <button
                            onClick={() => handleSendMessage('Rajeshwari Solar PAN')}
                            className="w-full text-left p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-200 transition"
                        >
                            📄 <span className="font-semibold">Rajeshwari Solar PAN</span>
                        </button>

                        <button
                            onClick={() => handleSendMessage('300 stemp apo je me test vayti jode kariyo ae')}
                            className="w-full text-left p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-200 transition"
                        >
                            📜 <span className="font-semibold">300 stamp test person</span> (Deep OCR)
                        </button>

                        <button
                            onClick={() => handleSendMessage('geda document apo')}
                            className="w-full text-left p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-200 transition"
                        >
                            ⚡ <span className="font-semibold">geda document</span> (Disambiguation)
                        </button>

                        <button
                            onClick={() => handleSendMessage('/zip all')}
                            className="w-full text-left p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-200 transition"
                        >
                            📦 <span className="font-semibold">/zip all</span> (Auto ZIP)
                        </button>
                    </div>
                </div>

                {/* Simulated User Profile */}
                <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 block">👤 Testing User Profile:</span>
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
