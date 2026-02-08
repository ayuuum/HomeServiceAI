import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Copy, Check, ExternalLink, Loader2, CheckCircle, SkipForward, Smartphone,
} from 'lucide-react';

interface Step5Props {
  onComplete: () => void;
  onBack: () => void;
}

export function Step5Liff({ onComplete, onBack }: Step5Props) {
  const { organization, refreshOrganization } = useAuth();
  const { toast } = useToast();
  const [liffId, setLiffId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const orgSlug = organization?.slug || '{orgSlug}';
  const domain = window.location.origin;
  const endpointUrl = `${domain}/liff/booking/${orgSlug}`;

  const handleCopyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(endpointUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      toast({ title: "コピーしました" });
    } catch {
      toast({ variant: "destructive", title: "コピー失敗" });
    }
  };

  const handleSave = async () => {
    if (!organization?.id || !liffId.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ line_liff_id: liffId.trim() } as any)
        .eq('id', organization.id);

      if (error) throw error;

      await refreshOrganization();
      setSaved(true);
      toast({ title: "保存しました", description: "LIFF IDを保存しました" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "保存失敗",
        description: error instanceof Error ? error.message : "保存に失敗しました",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
          <Smartphone className="h-8 w-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold">LINEから予約を受け付ける（任意）</h3>
        <p className="text-sm text-muted-foreground">
          LIFFを設定すると、顧客がLINEアプリ内で予約できるようになります
        </p>
      </div>

      {/* Instructions */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
        <p className="text-sm font-medium">LIFFアプリの作成手順:</p>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <p>LINE Developersで「<strong>LINEログイン</strong>」チャネルを開く</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                ※ Messaging APIチャネルではありません
              </p>
            </div>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <p>「<strong>LIFF</strong>」タブ →「<strong>追加</strong>」をクリック</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-0.5 list-disc list-inside">
                <li>サイズ: <strong>Full</strong></li>
                <li>Scope: <strong>profile</strong> を有効化</li>
                <li>ボットリンク機能: <strong>On (Aggressive)</strong></li>
              </ul>
            </div>
          </li>
          <li className="flex gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
            <div>
              <p>エンドポイントURLに以下を設定:</p>
              <div className="flex gap-2 mt-1">
                <Input value={endpointUrl} readOnly className="font-mono text-xs bg-muted" />
                <Button variant="outline" size="icon" onClick={handleCopyEndpoint} className="shrink-0">
                  {copiedUrl ? <Check className="h-4 w-4 text-[#06C755]" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </li>
        </ol>
        <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
          <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer">
            LINE Developersを開く <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </Button>
      </div>

      {/* LIFF ID Input */}
      <div className="space-y-2">
        <Label htmlFor="wizard-liff-id" className="text-sm font-medium">
          LIFF ID
        </Label>
        <p className="text-xs text-muted-foreground">
          LIFFアプリ作成後に表示されるIDを入力してください
        </p>
        <Input
          id="wizard-liff-id"
          value={liffId}
          onChange={(e) => { setLiffId(e.target.value); setSaved(false); }}
          placeholder="例: 1234567890-abcdefgh"
          className="font-mono"
        />
      </div>

      {/* Saved success */}
      {saved && (
        <div className="rounded-lg bg-[#06C755]/10 border border-[#06C755]/30 p-3 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-[#06C755] flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-[#06C755]">LIFF ID を保存しました</p>
            <p className="text-xs text-muted-foreground">
              LINEのリッチメニューに <code className="bg-muted px-1 rounded">https://liff.line.me/{liffId}</code> を設定すると、顧客がLINEから予約できるようになります
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1" />
          戻る
        </Button>
        {liffId.trim() && !saved ? (
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-[#06C755] hover:bg-[#06C755]/90 text-white"
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />保存中...</>
            ) : (
              '保存して完了'
            )}
          </Button>
        ) : saved ? (
          <Button
            onClick={onComplete}
            className="flex-1 bg-[#06C755] hover:bg-[#06C755]/90 text-white"
          >
            セットアップ完了
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={onComplete}
            className="flex-1"
          >
            <SkipForward className="h-4 w-4 mr-1" />
            あとで設定する
          </Button>
        )}
      </div>
    </div>
  );
}
