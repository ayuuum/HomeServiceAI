import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Copy, Check, ExternalLink, CheckCircle, Loader2, PartyPopper, AlertTriangle,
} from 'lucide-react';
import type { WebhookSetupResult } from './Step3Credentials';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Step4Props {
  botName: string | null;
  webhookResult: WebhookSetupResult;
  onNext: () => void;
  onBack: () => void;
}

type ViewMode = 'auto_success' | 'needs_activation' | 'fallback';

function getViewMode(result: WebhookSetupResult): ViewMode {
  if (result.success && result.webhookActive) return 'auto_success';
  if (result.success && !result.webhookActive) return 'needs_activation';
  return 'fallback';
}

export function Step4Webhook({ botName, webhookResult, onNext, onBack }: Step4Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [activationConfirmed, setActivationConfirmed] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-webhook`;
  const viewMode = getViewMode(webhookResult);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "コピーしました" });
    } catch {
      toast({ variant: "destructive", title: "コピー失敗" });
    }
  };

  const handleCheckActivation = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-line-webhook');
      if (error) throw error;
      if (data?.webhookActive) {
        setActivationConfirmed(true);
        toast({ title: "確認完了", description: "Webhookが有効になっています" });
      } else {
        toast({
          variant: "destructive",
          title: "まだ有効になっていません",
          description: "LINE Developersで「Webhookの利用」をONにしてください",
        });
      }
    } catch {
      toast({ variant: "destructive", title: "確認に失敗しました" });
    } finally {
      setIsChecking(false);
    }
  };

  // --- Pattern A: Full auto success ---
  if (viewMode === 'auto_success') {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-[#06C755]/10 flex items-center justify-center mx-auto">
            <PartyPopper className="h-8 w-8 text-[#06C755]" />
          </div>
          <h3 className="text-lg font-semibold">Webhook設定が完了しました！</h3>
          {botName && (
            <p className="text-sm text-muted-foreground">
              LINE公式アカウント「<span className="font-medium text-foreground">{botName}</span>」と接続済み
            </p>
          )}
        </div>

        <div className="rounded-lg bg-[#06C755]/10 border border-[#06C755]/30 p-4 text-center space-y-1">
          <CheckCircle className="h-6 w-6 text-[#06C755] mx-auto" />
          <p className="text-sm font-medium text-[#06C755]">Webhook URLの設定と検証が自動で完了しました</p>
          <p className="text-xs text-muted-foreground">LINEからのメッセージを受信できます</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack} className="flex-shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </Button>
          <Button
            onClick={onNext}
            className="flex-1 bg-[#06C755] hover:bg-[#06C755]/90 text-white"
          >
            次へ
          </Button>
        </div>
      </div>
    );
  }

  // --- Pattern B: URL set, but needs manual activation ---
  if (viewMode === 'needs_activation') {
    return (
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-[#06C755]/10 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-[#06C755]" />
          </div>
          <h3 className="text-lg font-semibold">あと1つだけ設定が必要です</h3>
          <p className="text-sm text-muted-foreground">
            Webhook URLは自動設定しました。LINE Developersで「Webhookの利用」をONにしてください。
          </p>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <ol className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
              <span>LINE Developersで Messaging APIチャネルを開く</span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
              <span>「<strong>Messaging API設定</strong>」タブ → 「<strong>Webhookの利用</strong>」をONにする</span>
            </li>
          </ol>
          <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
            <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer">
              LINE Developersを開く <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </div>

        {activationConfirmed && (
          <div className="rounded-lg bg-[#06C755]/10 border border-[#06C755]/30 p-4 text-center space-y-1">
            <PartyPopper className="h-6 w-6 text-[#06C755] mx-auto" />
            <p className="text-sm font-semibold text-[#06C755]">Webhookが有効になりました！</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onBack} className="flex-shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </Button>
          {!activationConfirmed && (
            <Button
              variant="outline"
              onClick={handleCheckActivation}
              disabled={isChecking}
              className="flex-shrink-0"
            >
              {isChecking ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />確認中</>
              ) : (
                '有効か確認'
              )}
            </Button>
          )}
          <Button
            onClick={onNext}
            className="flex-1 bg-[#06C755] hover:bg-[#06C755]/90 text-white"
          >
            次へ
          </Button>
        </div>
      </div>
    );
  }

  // --- Pattern C: Fallback — manual webhook setup ---
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold">Webhookを手動で設定してください</h3>
        <p className="text-sm text-muted-foreground">
          自動設定できませんでした。以下の手順で手動設定をお願いします。
        </p>
      </div>

      {/* Webhook URL */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Webhook URL</p>
        <div className="flex gap-2">
          <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted" />
          <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-[#06C755]" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Manual Instructions */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-medium">設定手順:</p>
        <ol className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
            <span>LINE Developersで Messaging APIチャネルを開く</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
            <span>「<strong>Messaging API設定</strong>」タブ → 「<strong>Webhook URL</strong>」に上記URLを貼付</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
            <span>「<strong>検証</strong>」ボタンをクリック</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</span>
            <span>「<strong>Webhookの利用</strong>」をONにする</span>
          </li>
        </ol>
        <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
          <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer">
            LINE Developersを開く <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </Button>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1" />
          戻る
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 bg-[#06C755] hover:bg-[#06C755]/90 text-white"
        >
          次へ
        </Button>
      </div>
    </div>
  );
}
