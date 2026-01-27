import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Copy, Check, ExternalLink, Bot } from 'lucide-react';

export function LineSettingsForm() {
  const { organization, refreshOrganization } = useAuth();
  const { toast } = useToast();

  const [channelToken, setChannelToken] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [botUserId, setBotUserId] = useState('');
  const [liffId, setLiffId] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  
  // Reminder Settings
  const [reminderHours, setReminderHours] = useState<number[]>([24]);

  // AI Settings
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiSystemPrompt, setAiSystemPrompt] = useState('');
  const [aiEscalationKeywords, setAiEscalationKeywords] = useState('スタッフ, 人間, 担当者, クレーム, 苦情');

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-webhook`;

  useEffect(() => {
    if (organization) {
      loadSettings();
    }
  }, [organization]);

  const loadSettings = async () => {
    if (!organization?.id) return;

    const { data, error } = await supabase
      .from('organizations')
      .select('line_channel_token, line_channel_secret, line_bot_user_id, line_liff_id, line_ai_enabled, line_ai_system_prompt, line_ai_escalation_keywords, line_reminder_hours_before')
      .eq('id', organization.id)
      .single();

    if (error) {
      console.error('Failed to load LINE settings:', error);
      return;
    }

    if (data) {
      // Show masked values if they exist
      if (data.line_channel_token) {
        setChannelToken('••••••••••••••••');
        setHasExistingConfig(true);
      }
      if (data.line_channel_secret) {
        setChannelSecret('••••••••••••••••');
      }
      if ((data as any).line_bot_user_id) {
        setBotUserId((data as any).line_bot_user_id);
      }
      if ((data as any).line_liff_id) {
        setLiffId((data as any).line_liff_id);
      }
      // Reminder settings
      if ((data as any).line_reminder_hours_before) {
        const hours = (data as any).line_reminder_hours_before;
        if (Array.isArray(hours)) {
          setReminderHours(hours);
        }
      }
      // AI settings
      if ((data as any).line_ai_enabled !== undefined) {
        setAiEnabled((data as any).line_ai_enabled);
      }
      if ((data as any).line_ai_system_prompt) {
        setAiSystemPrompt((data as any).line_ai_system_prompt);
      }
      if ((data as any).line_ai_escalation_keywords) {
        const keywords = (data as any).line_ai_escalation_keywords;
        if (Array.isArray(keywords)) {
          setAiEscalationKeywords(keywords.join(', '));
        }
      }
    }
  };

  const handleSave = async () => {
    if (!organization?.id) return;

    try {
      setIsLoading(true);

      const updates: Record<string, string | boolean | string[] | null> = {};

      // Only update if value is not masked
      if (channelToken && !channelToken.includes('•')) {
        updates.line_channel_token = channelToken.trim();
      }
      if (channelSecret && !channelSecret.includes('•')) {
        updates.line_channel_secret = channelSecret.trim();
      }
      if (botUserId) {
        updates.line_bot_user_id = botUserId.trim();
      }
      if (liffId) {
        updates.line_liff_id = liffId.trim();
      }
      
      // Always update reminder and AI settings
      (updates as any).line_reminder_hours_before = reminderHours;
      updates.line_ai_enabled = aiEnabled;
      if (aiSystemPrompt) {
        updates.line_ai_system_prompt = aiSystemPrompt.trim();
      }
      if (aiEscalationKeywords) {
        updates.line_ai_escalation_keywords = aiEscalationKeywords.split(',').map(k => k.trim()).filter(Boolean);
      }

      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organization.id);

      if (error) throw error;

      await refreshOrganization();
      setHasExistingConfig(true);

      toast({
        title: "保存完了",
        description: "LINE設定を保存しました",
      });
    } catch (error) {
      console.error('Failed to save LINE settings:', error);
      toast({
        variant: "destructive",
        title: "保存失敗",
        description: error instanceof Error ? error.message : "LINE設定の保存に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "コピーしました",
        description: "Webhook URLをクリップボードにコピーしました",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "コピー失敗",
        description: "クリップボードへのコピーに失敗しました",
      });
    }
  };

  const handleTestConnection = async () => {
    if (!organization?.id) return;

    try {
      setIsTesting(true);

      // Call Edge Function to test LINE connection (avoids CORS issues)
      const { data, error } = await supabase.functions.invoke('test-line-connection');

      if (error) {
        throw new Error(error.message || '接続テストに失敗しました');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success && data?.botInfo) {
        // Auto-fill bot user ID
        if (data.botInfo.userId) {
          setBotUserId(data.botInfo.userId);
        }

        toast({
          title: "接続成功",
          description: `LINE公式アカウント「${data.botInfo.displayName}」と接続されています`,
        });
      } else {
        throw new Error('予期しないレスポンスです');
      }
    } catch (error) {
      console.error('Test connection error:', error);
      toast({
        variant: "destructive",
        title: "接続失敗",
        description: error instanceof Error ? error.message : "接続テストに失敗しました",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    setChannelToken('');
    setChannelSecret('');
    setBotUserId('');
    setLiffId('');
    setHasExistingConfig(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#06C755] flex items-center justify-center">
            <Icon name="chat" size={18} className="text-white" />
          </div>
          LINE連携設定
        </CardTitle>
        <CardDescription>
          LINE公式アカウントを連携して、顧客とメッセージのやり取りができます
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Webhook URL */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Webhook URL</Label>
          <p className="text-xs text-muted-foreground mb-2">
            LINE Developersの「Messaging API設定」→「Webhook URL」に設定してください
          </p>
          <div className="flex gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="font-mono text-sm bg-muted"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyWebhook}
              className="shrink-0"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Channel Access Token */}
        <div className="space-y-2">
          <Label htmlFor="channelToken">Channel Access Token (長期)</Label>
          <p className="text-xs text-muted-foreground">
            LINE Developersの「Messaging API設定」→「チャネルアクセストークン」を発行して入力
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="channelToken"
                type={showToken ? "text" : "password"}
                value={channelToken}
                onChange={(e) => setChannelToken(e.target.value)}
                placeholder="Bearer token を入力"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Channel Secret */}
        <div className="space-y-2">
          <Label htmlFor="channelSecret">Channel Secret</Label>
          <p className="text-xs text-muted-foreground">
            LINE Developersの「チャネル基本設定」→「チャネルシークレット」を入力
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="channelSecret"
                type={showSecret ? "text" : "password"}
                value={channelSecret}
                onChange={(e) => setChannelSecret(e.target.value)}
                placeholder="Channel secret を入力"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Bot User ID */}
        <div className="space-y-2">
          <Label htmlFor="botUserId">Bot User ID</Label>
          <p className="text-xs text-muted-foreground">
            「接続テスト」をクリックすると自動入力されます
          </p>
          <Input
            id="botUserId"
            value={botUserId}
            onChange={(e) => setBotUserId(e.target.value)}
            placeholder="U で始まる Bot User ID"
            className="font-mono"
          />
        </div>

        {/* LIFF ID */}
        <div className="space-y-2">
          <Label htmlFor="liffId">LIFF ID</Label>
          <p className="text-xs text-muted-foreground">
            LINE Developersの「LIFF」タブで作成したLIFFアプリのIDを入力してください。
            これにより、LINEから予約した際の顧客情報の自動紐付けが有効になります。
          </p>
          <Input
            id="liffId"
            value={liffId}
            onChange={(e) => setLiffId(e.target.value)}
            placeholder="例: 1234567890-abcdefgh"
            className="font-mono"
          />
        </div>

        {/* Reminder Settings Section */}
        <div className="pt-6 border-t space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="notifications" size={20} className="text-primary" />
            <h3 className="font-semibold">リマインダー設定</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            予約前に自動でリマインダーを送信するタイミングを設定します
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { value: 1, label: '1時間前' },
              { value: 3, label: '3時間前' },
              { value: 24, label: '24時間前（1日前）' },
              { value: 48, label: '48時間前（2日前）' },
              { value: 72, label: '72時間前（3日前）' },
            ].map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`reminder-${option.value}`}
                  checked={reminderHours.includes(option.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setReminderHours([...reminderHours, option.value].sort((a, b) => a - b));
                    } else {
                      setReminderHours(reminderHours.filter(h => h !== option.value));
                    }
                  }}
                />
                <Label htmlFor={`reminder-${option.value}`} className="text-sm cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
          {reminderHours.length === 0 && (
            <p className="text-xs text-amber-600">
              タイミングが選択されていないため、自動リマインダーは送信されません
            </p>
          )}
        </div>

        {/* AI Auto-Response Section */}
        <div className="pt-6 border-t space-y-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI自動応答</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="aiEnabled">AI自動応答を有効にする</Label>
              <p className="text-xs text-muted-foreground">
                LINEからのメッセージにAIが自動で返信します
              </p>
            </div>
            <Switch
              id="aiEnabled"
              checked={aiEnabled}
              onCheckedChange={setAiEnabled}
            />
          </div>

          {aiEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="aiSystemPrompt">AI応答スタイルの追加指示（任意）</Label>
                <p className="text-xs text-muted-foreground">
                  AIの応答スタイルを調整するための追加指示です。サービス情報は自動的に含まれます。
                  例：「フレンドリーな口調で」「敬語を厳密に」
                </p>
                <Textarea
                  id="aiSystemPrompt"
                  value={aiSystemPrompt}
                  onChange={(e) => setAiSystemPrompt(e.target.value)}
                  placeholder="例: 明るく元気な言葉遣いで対応してください"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aiEscalationKeywords">エスカレーションキーワード</Label>
                <p className="text-xs text-muted-foreground">
                  これらのキーワードが含まれるメッセージは、AIではなくスタッフに通知されます（カンマ区切り）
                </p>
                <Input
                  id="aiEscalationKeywords"
                  value={aiEscalationKeywords}
                  onChange={(e) => setAiEscalationKeywords(e.target.value)}
                  placeholder="スタッフ, 人間, 担当者, クレーム, 苦情"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-4">
          <Button
            onClick={handleTestConnection}
            variant="outline"
            disabled={isTesting || !hasExistingConfig}
          >
            {isTesting ? (
              <>
                <Icon name="sync" size={16} className="mr-2 animate-spin" />
                テスト中...
              </>
            ) : (
              <>
                <Icon name="wifi" size={16} className="mr-2" />
                接続テスト
              </>
            )}
          </Button>

          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-[#06C755] hover:bg-[#06C755]/90"
          >
            {isLoading ? (
              <>
                <Icon name="sync" size={16} className="mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Icon name="save" size={16} className="mr-2" />
                設定を保存
              </>
            )}
          </Button>

          {hasExistingConfig && (
            <Button
              variant="ghost"
              onClick={handleClear}
              className="text-muted-foreground"
            >
              <Icon name="refresh" size={16} className="mr-2" />
              再入力
            </Button>
          )}
        </div>

        {/* Help link */}
        <div className="pt-4 border-t">
          <a
            href="https://developers.line.biz/console/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            LINE Developers Console を開く
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
