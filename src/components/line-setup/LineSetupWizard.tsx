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
import { Step3Credentials, type WebhookSetupResult } from './Step3Credentials';
import { Step4Webhook } from './Step4Webhook';
import { Step5Liff } from './Step5Liff';

interface LineSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const defaultWebhookResult: WebhookSetupResult = {
  attempted: false,
  success: false,
  webhookActive: false,
  testSuccess: false,
};

export function LineSetupWizard({ open, onOpenChange, onComplete }: LineSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [botName, setBotName] = useState<string | null>(null);
  const [webhookResult, setWebhookResult] = useState<WebhookSetupResult>(defaultWebhookResult);

  const handleComplete = () => {
    setStep(1);
    setWebhookResult(defaultWebhookResult);
    onComplete();
    onOpenChange(false);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setStep(1);
      setWebhookResult(defaultWebhookResult);
    }
    onOpenChange(value);
  };

  const handleStep3Next = (name: string | null, result: WebhookSetupResult) => {
    setBotName(name);
    setWebhookResult(result);
    setStep(4);
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

        <StepIndicator currentStep={step} totalSteps={5} />

        <div className="py-2">
          {step === 1 && <Step1OfficialAccount onNext={() => setStep(2)} />}
          {step === 2 && <Step2MessagingAPI onNext={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && (
            <Step3Credentials
              onNext={handleStep3Next}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <Step4Webhook
              botName={botName}
              webhookResult={webhookResult}
              onNext={() => setStep(5)}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <Step5Liff
              onComplete={handleComplete}
              onBack={() => setStep(4)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
