import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Eye, EyeOff, ExternalLink, Loader2, CheckCircle } from 'lucide-react';

export interface WebhookSetupResult {
  attempted: boolean;
  success: boolean;
  webhookActive: boolean;
  testSuccess: boolean;
  error?: string;
}

interface Step3Props {
  onNext: (botName: string | null, webhookResult: WebhookSetupResult) => void;
  onBack: () => void;
}

export function Step3Credentials({ onNext, onBack }: Step3Props) {
  const { organization, refreshOrganization } = useAuth();
  const { toast } = useToast();
  const [channelToken, setChannelToken] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; botName?: string } | null>(null);
  const [webhookPhase, setWebhookPhase] = useState<'idle' | 'setting' | 'done'>('idle');

  const handleTest = async () => {
    if (!organization?.id || !channelToken.trim() || !channelSecret.trim()) return;

    setIsTesting(true);
    setTestResult(null);
    setWebhookPhase('idle');

    let botName: string | null = null;
    let webhookResult: WebhookSetupResult = {
      attempted: false,
      success: false,
      webhookActive: false,
      testSuccess: false,
    };

    try {
      // Save credentials first
      const { error: saveError } = await supabase
        .from('organizations')
        .update({
          line_channel_token: channelToken.trim(),
          line_channel_secret: channelSecret.trim(),
        })
        .eq('id', organization.id);

      if (saveError) throw saveError;

      // Test connection
      const { data, error } = await supabase.functions.invoke('test-line-connection');

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.success && data?.botInfo) {
        // Auto-save bot user ID
        await supabase
          .from('organizations')
          .update({ line_bot_user_id: data.botInfo.userId } as any)
          .eq('id', organization.id);

        await refreshOrganization();
        botName = data.botInfo.displayName;
        setTestResult({ success: true, botName });

        // Connection succeeded — now auto-setup webhook
        setWebhookPhase('setting');
        try {
          const { data: whData, error: whError } = await supabase.functions.invoke('setup-line-webhook');

          webhookResult.attempted = true;

          if (whError) {
            console.error('Webhook auto-setup error:', whError);
            webhookResult.error = whError.message;
          } else if (whData?.success) {
            webhookResult.success = true;
            webhookResult.webhookActive = whData.webhookActive ?? false;
            webhookResult.testSuccess = whData.testSuccess ?? false;
          } else {
            webhookResult.error = whData?.error || 'Webhook設定に失敗しました';
          }
        } catch (whErr) {
          console.error('Webhook auto-setup exception:', whErr);
          webhookResult.attempted = true;
          webhookResult.error = whErr instanceof Error ? whErr.message : 'Webhook設定中にエラーが発生しました';
        }
        setWebhookPhase('done');
      } else {
        throw new Error('接続に失敗しました');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setTestResult({ success: false });
      toast({
        variant: "destructive",
        title: "接続テスト失敗",
        description: error instanceof Error ? error.message : "認証情報を確認してください",
      });
    } finally {
      setIsTesting(false);
    }

    // If connection test succeeded, auto-proceed to next step with webhook result
    if (botName) {
      onNext(botName, webhookResult);
    }
  };

  const statusMessage = webhookPhase === 'setting'
    ? 'Webhook設定中...'
    : isTesting
      ? 'テスト中...'
      : '接続テスト';

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">認証情報を入力</h3>
        <p className="text-sm text-muted-foreground">
          LINE Developersから2つの情報をコピーしてください
        </p>
      </div>

      {/* Channel Access Token */}
      <div className="space-y-2">
        <Label htmlFor="wizard-token" className="text-sm font-medium">
          Channel Access Token（長期）
          <span className="text-destructive ml-1">*</span>
        </Label>
        <div className="relative">
          <Input
            id="wizard-token"
            type={showToken ? "text" : "password"}
            value={channelToken}
            onChange={(e) => { setChannelToken(e.target.value); setTestResult(null); }}
            placeholder="トークンを貼り付け"
            className="pr-10 font-mono text-sm"
          />
          <Button
            type="button" variant="ghost" size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowToken(!showToken)}
          >
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5">
            LINE Developers <ExternalLink className="h-3 w-3" />
          </a>
          → チャネル → Messaging API設定 → 「発行」
        </p>
      </div>

      {/* Channel Secret */}
      <div className="space-y-2">
        <Label htmlFor="wizard-secret" className="text-sm font-medium">
          Channel Secret
          <span className="text-destructive ml-1">*</span>
        </Label>
        <div className="relative">
          <Input
            id="wizard-secret"
            type={showSecret ? "text" : "password"}
            value={channelSecret}
            onChange={(e) => { setChannelSecret(e.target.value); setTestResult(null); }}
            placeholder="シークレットを貼り付け"
            className="pr-10 font-mono text-sm"
          />
          <Button
            type="button" variant="ghost" size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowSecret(!showSecret)}
          >
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          チャネル基本設定タブに記載
        </p>
      </div>

      {/* Test result */}
      {testResult?.success && (
        <div className="rounded-lg bg-[#06C755]/10 border border-[#06C755]/30 p-3 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-[#06C755] flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-[#06C755]">接続成功！</p>
            {testResult.botName && (
              <p className="text-xs text-muted-foreground">
                「{testResult.botName}」と接続されました
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="flex-shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1" />
          戻る
        </Button>
        <Button
          onClick={handleTest}
          disabled={isTesting || webhookPhase === 'setting' || !channelToken.trim() || !channelSecret.trim()}
          className="flex-1 bg-[#06C755] hover:bg-[#06C755]/90 text-white"
        >
          {(isTesting || webhookPhase === 'setting') ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{statusMessage}</>
          ) : (
            '接続テスト'
          )}
        </Button>
      </div>
    </div>
  );
}
