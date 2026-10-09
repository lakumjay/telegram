import React, { useState } from 'react';
import { 
    Sparkles, 
    Home, 
    Layers, 
    Camera, 
    PhoneCall, 
    Check, 
    ArrowRight,
    ShieldCheck
} from 'lucide-react';

export default function WelcomeTourModal({ isOpen, onClose, userName }) {
    if (!isOpen) return null;

    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Welcome to DocVoice AI",
            desc: `Hello ${userName || 'User'}! Welcome to your private, encrypted document management assistant. Let's take a quick 30-second tour to understand all features.`,
            icon: Sparkles,
            color: "text-blue-600 bg-blue-50 border-blue-200"
        },
        {
            title: "Home & Quick Search",
            desc: "Use the top search bar to instantly find any invoice, GST certificate, stamp paper, or agreement by keyword or company name.",
            icon: Home,
            color: "text-emerald-600 bg-emerald-50 border-emerald-200"
        },
        {
            title: "My Files & Folder Management",
            desc: "All your private documents are organized here. Long-press any file on mobile to move, copy, view OCR details, or delete.",
            icon: Layers,
            color: "text-indigo-600 bg-indigo-50 border-indigo-200"
        },
        {
            title: "CamScanner & Upload",
            desc: "Upload PDFs or tap 'Scan' to snap photos using your mobile back camera. Our AI automatically extracts text and detects document types.",
            icon: Camera,
            color: "text-amber-600 bg-amber-50 border-amber-200"
        },
        {
            title: "AI Voice & Telegram Sync",
            desc: "Connect via Telegram or use the central floating call dial to talk with AI in real-time about your documents in English or Gujarati.",
            icon: PhoneCall,
            color: "text-cyan-600 bg-cyan-50 border-cyan-200"
        }
    ];

    const currentStepData = steps[step];
    const StepIcon = currentStepData.icon;

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5 animate-scaleUp">
                
                {/* Progress Indicators */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Feature Guide ({step + 1} of {steps.length})
                    </span>
                    <button
                        onClick={onClose}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-700"
                    >
                        Skip
                    </button>
                </div>

                {/* Step Content */}
                <div className="text-center space-y-3 py-2">
                    <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border ${currentStepData.color}`}>
                        <StepIcon className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                        {currentStepData.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                        {currentStepData.desc}
                    </p>
                </div>

                {/* Step Dots */}
                <div className="flex justify-center space-x-1.5">
                    {steps.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-200 ${
                                idx === step ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-200'
                            }`}
                        />
                    ))}
                </div>

                {/* Action Button */}
                <div className="pt-2">
                    <button
                        onClick={handleNext}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                        {step === steps.length - 1 ? (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Get Started</span>
                            </>
                        ) : (
                            <>
                                <span>Next</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
