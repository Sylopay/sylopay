import React from 'react';
import { Check } from 'lucide-react';

interface ProgressBarProps {
  currentStep: string;
  className?: string;
}

const steps = [
  { id: 'checkout', label: 'Product', description: 'Select item' },
  { id: 'quotation', label: 'Plan', description: 'Choose installments' },
  { id: 'contract', label: 'Details', description: 'Personal info' },
  { id: 'processing', label: 'Processing', description: 'On-chain creation' },
  { id: 'dashboard', label: 'Dashboard', description: 'Manage BNPL' }
];

export function ProgressBar({ currentStep, className = '' }: ProgressBarProps) {
  const currentIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                
                {/* Connector Line (Left side - hidden for first item) */}
                <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                  index === 0 ? 'invisible' : isCompleted || isCurrent ? 'bg-orange-500' : 'bg-zinc-800'
                }`} />

                {/* Step Circle */}
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 flex-shrink-0 z-10
                  ${isCompleted 
                    ? 'bg-orange-600 border-orange-600 text-white shadow-[0_0_10px_rgba(234,88,12,0.3)]' 
                    : isCurrent 
                    ? 'bg-[#121212] border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.2)]' 
                    : 'bg-[#0a0a0a] border-zinc-800 text-zinc-600'
                  }
                `}>
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-[11px] font-bold">{index + 1}</span>
                  )}
                </div>

                {/* Connector Line (Right side - hidden for last item) */}
                <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                  index === steps.length - 1 ? 'invisible' : isCompleted ? 'bg-orange-500' : 'bg-zinc-800'
                }`} />
              </div>

              {/* Step Label */}
              <div className="mt-3 text-center">
                <div className={`
                  text-[11px] uppercase tracking-wider font-bold transition-colors
                  ${isCurrent ? 'text-orange-500' : isCompleted ? 'text-zinc-300' : 'text-zinc-600'}
                `}>
                  {step.label}
                </div>
                <div className={`text-[10px] mt-1 hidden sm:block ${isCurrent ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressBar;