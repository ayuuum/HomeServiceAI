import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { StepIndicator } from './StepIndicator';
import { Step1OfficialAccount } from './Step1OfficialAccount';
import { Step2MessagingAPI } from './Step2MessagingAPI';
import { Step3Credentials } from './Step3Credentials';
import { Step4Webhook } from './Step4Webhook';

interface LineSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function LineSetupWizard({ open, onOpenChange, onComplete }: LineSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [botName, setBotName] = useState<string | null>(null);

  const handleComplete = () => {
    setStep(1);
    onComplete();
    onOpenChange(false);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) setStep(1);
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-7 h-7 rounded-lg bg-[#06C755] flex items-center justify-center text-white text-sm font-bold">L</div>
            LINE連携セットアップ
          </DialogTitle>
          <DialogDescription>
            ステップに沿って設定するだけで、LINE公式アカウントと連携できます
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={step} totalSteps={4} />

        <div className="py-2">
          {step === 1 && <Step1OfficialAccount onNext={() => setStep(2)} />}
          {step === 2 && <Step2MessagingAPI onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && (
            <Step3Credentials
              onNext={(name) => { setBotName(name); setStep(4); }}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <Step4Webhook
              botName={botName}
              onComplete={handleComplete}
              onBack={() => setStep(3)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
