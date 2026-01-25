import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Eye, EyeOff, Copy, Check, ExternalLink } from 'lucide-react';

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
      .select('line_channel_token, line_channel_secret, line_bot_user_id, line_liff_id')
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
      if (data.line_bot_user_id) {
        setBotUserId(data.line_bot_user_id);
      }
      if (data.line_liff_id) {
        setLiffId(data.line_liff_id);
      }
    }
  };

  const handleSave = async () => {
    if (!organization?.id) return;

    try {
      setIsLoading(true);

      const updates: Record<string, string | null> = {};

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

      if (Object.keys(updates).length === 0) {
        toast({
          variant: "destructive",
          title: "入力エラー",
          description: "保存する値を入力してください",
        });
        return;
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

        {/* Action buttons */}
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
