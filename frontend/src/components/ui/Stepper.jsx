import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Stepper({ currentStep, steps = ["Sélection Patients", "Paramètres", "Résultats"] }) {
    return (
        <div className="flex items-center justify-center mb-8">
            {steps.map((label, idx) => {
                const stepNum = idx + 1;
                const isCompleted = currentStep > stepNum;
                const isCurrent = currentStep === stepNum;

                return (
                    <div key={idx} className="flex items-center">
                        <div className="flex flex-col items-center relative">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-colors",
                                isCompleted ? "bg-green-500 border-green-500 text-white" :
                                    isCurrent ? "bg-blue-600 border-blue-600 text-white" :
                                        "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400"
                            )}>
                                {isCompleted ? <Check size={20} /> : stepNum}
                            </div>
                            <span className={cn(
                                "absolute -bottom-6 text-xs font-medium whitespace-nowrap",
                                isCurrent ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                            )}>{label}</span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={cn(
                                "w-16 h-1 mx-2 transition-colors",
                                isCompleted ? "bg-green-500" : "bg-gray-200 dark:bg-slate-700"
                            )} />
                        )}
                    </div>
                )
            })}
        </div>
    );
}
