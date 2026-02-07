import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Copy, Check, ExternalLink, CheckCircle, Loader2, PartyPopper,
} from 'lucide-react';

interface Step4Props {
  botName: string | null;
  onComplete: () => void;
  onBack: () => void;
}

export function Step4Webhook({ botName, onComplete, onBack }: Step4Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-webhook`;

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

  const handleVerifyWebhook = async () => {
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-line-connection');
      if (error) throw error;
      if (data?.success) {
        setVerified(true);
        toast({ title: "Webhook検証成功", description: "正常に動作しています" });
      } else {
        throw new Error('検証失敗');
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Webhook検証失敗",
        description: "Webhook URLが正しく設定されているか確認してください",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Success header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-[#06C755]/10 flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-[#06C755]" />
        </div>
        <h3 className="text-lg font-semibold">あと少しで完了！</h3>
        {botName && (
          <p className="text-sm text-muted-foreground">
            LINE公式アカウント「<span className="font-medium text-foreground">{botName}</span>」と接続済み
          </p>
        )}
      </div>

      {/* Webhook URL */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          以下のWebhook URLをLINE Developersに設定してください
        </p>
        <div className="flex gap-2">
          <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted" />
          <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-[#06C755]" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-medium">設定手順:</p>
        <ol className="space-y-2 text-sm">
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
            <span>LINE Developersでチャネルを開く</span>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
            <span>Messaging API設定 → Webhook URL に上記URLを貼付</span>
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

      {/* Verified success */}
      {verified && (
        <div className="rounded-lg bg-[#06C755]/10 border border-[#06C755]/30 p-4 text-center space-y-1">
          <PartyPopper className="h-8 w-8 text-[#06C755] mx-auto" />
          <p className="text-sm font-semibold text-[#06C755]">セットアップ完了！</p>
          <p className="text-xs text-muted-foreground">LINEからのメッセージを受信できます</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1" />
          戻る
        </Button>
        <Button
          variant="outline"
          onClick={handleVerifyWebhook}
          disabled={isVerifying}
          className="flex-shrink-0"
        >
          {isVerifying ? (
            <><Loader2 className="h-4 w-4 mr-1 animate-spin" />検証中</>
          ) : (
            'Webhookを検証'
          )}
        </Button>
        <Button
          onClick={onComplete}
          className="flex-1 bg-[#06C755] hover:bg-[#06C755]/90 text-white"
        >
          セットアップ完了
        </Button>
      </div>
    </div>
  );
}
