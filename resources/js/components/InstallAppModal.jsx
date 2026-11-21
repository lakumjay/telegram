import React, { useState, useEffect } from 'react';
import { 
    Download, 
    X, 
    Smartphone, 
    CheckCircle2, 
    Share, 
    PlusSquare, 
    MoreVertical, 
    Sparkles,
    Stethoscope
} from 'lucide-react';

export default function InstallAppModal({ 
    isOpen, 
    onClose, 
    onInstall, 
    canInstall, 
    deferredPrompt 
}) {
    const [showInstructions, setShowInstructions] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Detect if running in standalone mode (already installed as PWA)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                             window.navigator.standalone || 
                             document.referrer.includes('android-app://');
        if (isStandalone) {
            setIsInstalled(true);
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIPhone = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIPhone);
    }, []);

    if (!isOpen || isInstalled) return null;

    const handleInstallClick = () => {
        if (deferredPrompt) {
            onInstall();
            onClose();
        } else {
            // If deferredPrompt is not available (like iOS Safari or custom Chrome state), show simple 2-step guide
            setShowInstructions(true);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 my-auto relative animate-in zoom-in-95">
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* App Icon & Badge */}
                <div className="text-center space-y-2 pt-2">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 mx-auto p-1 border-2 border-emerald-400/40">
                        <Stethoscope className="w-9 h-9 text-white animate-pulse" />
                    </div>
                    
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200/80">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>હોમ સ્ક્રીન ઍપ ઇન્સ્ટોલેશન</span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                        DocVoice Clinic AI ઍપ ઇન્સ્ટોલ કરો
                    </h3>
                    <p className="text-xs text-slate-500 font-medium px-2">
                        તમારા ફોન અથવા કમ્પ્યુટર પર સીધી ઍપ તરીકે ઇન્સ્ટોલ કરો જેથી એક ટૅપમાં ઑફલાઇન સપોર્ટ સાથે ખૂલી જાય!
                    </p>
                </div>

                {/* Benefits List */}
                <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 text-xs font-bold text-slate-700">
                    <div className="flex items-center space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>વારંવાર Chrome માં URL લખવાની જરૂર નહીં</span>
                    </div>
                    <div className="flex items-center space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>સુપર ફાસ્ટ સ્પીડ & સીધા પેશન્ટ સર્ચ</span>
                    </div>
                    <div className="flex items-center space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>AI લાઈવ વૉઇસ કૉલિંગ & પ્રિસ્ક્રિપ્શન સ્કેન</span>
                    </div>
                </div>

                {/* Instructions if deferredPrompt is not supported */}
                {showInstructions && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2 animate-in fade-in">
                        <p className="font-black flex items-center gap-1">
                            <span>સરળ ૨ સ્ટેપમાં ઍપ ઉમેરો:</span>
                        </p>
                        {isIOS ? (
                            <ol className="list-decimal pl-4 space-y-1 font-semibold text-[11px]">
                                <li>નીચે Safari મેનૂમાં <Share className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> <b>Share</b> બટન દબાવો.</li>
                                <li>નીચે સ્ક્રોલ કરીને <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-slate-700" /> <b>Add to Home Screen</b> પસંદ કરો.</li>
                            </ol>
                        ) : (
                            <ol className="list-decimal pl-4 space-y-1 font-semibold text-[11px]">
                                <li>ઉપર જમણી બાજુ <MoreVertical className="w-3.5 h-3.5 inline mx-1 text-slate-700" /> <b>૩ ટપકાં (Menu)</b> પર ક્લિક કરો.</li>
                                <li><b>Install app</b> અથવા <b>Add to Home Screen</b> પર ટૅપ કરો.</li>
                            </ol>
                        )}
                    </div>
                )}

                {/* Main Action Buttons */}
                <div className="space-y-2 pt-1">
                    <button
                        onClick={handleInstallClick}
                        className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-700/20 active:scale-[0.98] transition cursor-pointer flex items-center justify-center space-x-2"
                    >
                        <Download className="w-4 h-4" />
                        <span>હમણાં ઇન્સ્ટોલ કરો (Install Now)</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-2.5 text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                        પછી કરીશ (Maybe Later)
                    </button>
                </div>

            </div>
        </div>
    );
}
