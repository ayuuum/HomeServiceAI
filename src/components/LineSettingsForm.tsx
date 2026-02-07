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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Eye, EyeOff, Copy, Check, ExternalLink, Bot, ChevronDown, Wand2 } from 'lucide-react';
import { LineSetupWizard } from './line-setup/LineSetupWizard';

export function LineSettingsForm() {
  const { organization, refreshOrganization } = useAuth();
  const { toast } = useToast();

  const [channelToken, setChannelToken] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [liffId, setLiffId] = useState('');
  const [adminLineUserId, setAdminLineUserId] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Reminder Settings
  const [reminderHours, setReminderHours] = useState<number[]>([24]);

  // AI Settings
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiSystemPrompt, setAiSystemPrompt] = useState('');
  const [aiEscalationKeywords, setAiEscalationKeywords] = useState('スタッフ, 人間, 担当者, クレーム, 苦情');

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-webhook`;

  useEffect(() => {
    if (organization) loadSettings();
  }, [organization]);

  const loadSettings = async () => {
    if (!organization?.id) return;

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organization.id)
      .single();

    if (error || !data) return;

    if (data.line_channel_token) {
      setChannelToken('••••••••••••••••');
      setHasExistingConfig(true);
    }
    if (data.line_channel_secret) setChannelSecret('••••••••••••••••');
    if ((data as any).line_liff_id) setLiffId((data as any).line_liff_id);
    if ((data as any).admin_line_user_id) setAdminLineUserId((data as any).admin_line_user_id);
    if ((data as any).line_reminder_hours_before) {
      const hours = (data as any).line_reminder_hours_before;
      if (Array.isArray(hours)) setReminderHours(hours);
    }
    if ((data as any).line_ai_enabled !== undefined) setAiEnabled((data as any).line_ai_enabled);
    if ((data as any).line_ai_system_prompt) setAiSystemPrompt((data as any).line_ai_system_prompt);
    if ((data as any).line_ai_escalation_keywords) {
      const keywords = (data as any).line_ai_escalation_keywords;
      if (Array.isArray(keywords)) setAiEscalationKeywords(keywords.join(', '));
    }
  };

  const handleSave = async () => {
    if (!organization?.id) return;
    try {
      setIsLoading(true);
      const updates: Record<string, any> = {};

      if (channelToken && !channelToken.includes('•')) updates.line_channel_token = channelToken.trim();
      if (channelSecret && !channelSecret.includes('•')) updates.line_channel_secret = channelSecret.trim();
      if (liffId) updates.line_liff_id = liffId.trim();
      updates.admin_line_user_id = adminLineUserId.trim() || null;
      updates.line_reminder_hours_before = reminderHours;
      updates.line_ai_enabled = aiEnabled;
      if (aiSystemPrompt) updates.line_ai_system_prompt = aiSystemPrompt.trim();
      if (aiEscalationKeywords) {
        updates.line_ai_escalation_keywords = aiEscalationKeywords.split(',').map(k => k.trim()).filter(Boolean);
      }

      const { error } = await supabase.from('organizations').update(updates).eq('id', organization.id);
      if (error) throw error;

      await refreshOrganization();
      setHasExistingConfig(true);
      toast({ title: "保存完了", description: "LINE設定を保存しました" });
    } catch (error) {
      toast({ variant: "destructive", title: "保存失敗", description: error instanceof Error ? error.message : "保存に失敗しました" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "コピーしました" });
    } catch {
      toast({ variant: "destructive", title: "コピー失敗" });
    }
  };

  const handleTestConnection = async () => {
    if (!organization?.id) return;
    try {
      setIsTesting(true);
      const { data, error } = await supabase.functions.invoke('test-line-connection');
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.success && data?.botInfo) {
        toast({ title: "接続成功", description: `「${data.botInfo.displayName}」と接続されています` });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "接続失敗", description: error instanceof Error ? error.message : "接続テストに失敗しました" });
    } finally {
      setIsTesting(false);
    }
  };

  // Show wizard CTA for new users
  if (!hasExistingConfig) {
    return (
      <>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4 py-8">
              <div className="w-20 h-20 rounded-2xl bg-[#06C755]/10 flex items-center justify-center mx-auto">
                <div className="w-12 h-12 rounded-xl bg-[#06C755] flex items-center justify-center text-white text-2xl font-bold">L</div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">LINE連携を始めましょう</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  ステップバイステップのガイドに沿って、約10分でLINE公式アカウントと連携できます
                </p>
              </div>
              <Button
                onClick={() => setWizardOpen(true)}
                size="lg"
                className="bg-[#06C755] hover:bg-[#06C755]/90 text-white px-8"
              >
                <Wand2 className="h-5 w-5 mr-2" />
                セットアップを開始
              </Button>
              <p className="text-xs text-muted-foreground">
                LINE公式アカウント（無料）が必要です
              </p>
            </div>
          </CardContent>
        </Card>
        <LineSetupWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          onComplete={() => loadSettings()}
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#06C755] flex items-center justify-center">
                  <Icon name="chat" size={14} className="text-white" />
                </div>
                LINE連携設定
              </CardTitle>
              <CardDescription>接続済み</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
              <Wand2 className="h-4 w-4 mr-1" />
              ウィザード
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* === 基本設定（必須） === */}

          {/* Webhook URL */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted" />
              <Button variant="outline" size="icon" onClick={handleCopyWebhook} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-[#06C755]" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Channel Access Token */}
          <div className="space-y-1.5">
            <Label htmlFor="channelToken">Channel Access Token</Label>
            <div className="relative">
              <Input
                id="channelToken"
                type={showToken ? "text" : "password"}
                value={channelToken}
                onChange={(e) => setChannelToken(e.target.value)}
                placeholder="Bearer token を入力"
                className="pr-10"
              />
              <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowToken(!showToken)}>
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Channel Secret */}
          <div className="space-y-1.5">
            <Label htmlFor="channelSecret">Channel Secret</Label>
            <div className="relative">
              <Input
                id="channelSecret"
                type={showSecret ? "text" : "password"}
                value={channelSecret}
                onChange={(e) => setChannelSecret(e.target.value)}
                placeholder="Channel secret を入力"
                className="pr-10"
              />
              <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowSecret(!showSecret)}>
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* === 高度な設定 === */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-sm text-muted-foreground h-9 px-2">
                高度な設定（LIFF・リマインダー・AI）
                <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-5 pt-3">
              {/* LIFF ID */}
              <div className="space-y-1.5">
                <Label htmlFor="liffId">LIFF ID（任意）</Label>
                <p className="text-xs text-muted-foreground">LINEから予約履歴を確認する機能に必要です</p>
                <Input
                  id="liffId"
                  value={liffId}
                  onChange={(e) => setLiffId(e.target.value)}
                  placeholder="例: 1234567890-abcdefgh"
                  className="font-mono"
                />
              </div>

              {/* Admin LINE User ID */}
              <div className="space-y-1.5">
                <Label htmlFor="adminLineUserId">管理者LINE User ID（任意）</Label>
                <p className="text-xs text-muted-foreground">
                  LINE公式アカウントに「管理者登録」とメッセージを送ると自動設定されます
                </p>
                <Input
                  id="adminLineUserId"
                  value={adminLineUserId}
                  onChange={(e) => setAdminLineUserId(e.target.value)}
                  placeholder="U で始まる LINE User ID"
                  className="font-mono"
                />
              </div>

              {/* Reminder Settings */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center gap-2">
                  <Icon name="notifications" size={16} className="text-primary" />
                  <h3 className="text-sm font-semibold">リマインダー設定</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { value: 1, label: '1時間前' },
                    { value: 3, label: '3時間前' },
                    { value: 24, label: '1日前' },
                    { value: 48, label: '2日前' },
                    { value: 72, label: '3日前' },
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
                      <Label htmlFor={`reminder-${option.value}`} className="text-sm cursor-pointer">{option.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Auto-Response */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">AI自動応答</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="aiEnabled">AI自動応答を有効にする</Label>
                    <p className="text-xs text-muted-foreground">LINEからのメッセージにAIが自動で返信します</p>
                  </div>
                  <Switch id="aiEnabled" checked={aiEnabled} onCheckedChange={setAiEnabled} />
                </div>

                {aiEnabled && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="aiSystemPrompt">AI応答スタイルの追加指示</Label>
                      <Textarea
                        id="aiSystemPrompt"
                        value={aiSystemPrompt}
                        onChange={(e) => setAiSystemPrompt(e.target.value)}
                        placeholder="例: 明るく元気な言葉遣いで対応してください"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="aiEscalationKeywords">エスカレーションキーワード</Label>
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
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-3 border-t">
            <Button onClick={handleTestConnection} variant="outline" disabled={isTesting}>
              {isTesting ? (
                <><Icon name="sync" size={16} className="mr-2 animate-spin" />テスト中</>
              ) : (
                <><Icon name="wifi" size={16} className="mr-2" />接続テスト</>
              )}
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="bg-[#06C755] hover:bg-[#06C755]/90">
              {isLoading ? (
                <><Icon name="sync" size={16} className="mr-2 animate-spin" />保存中</>
              ) : (
                <><Icon name="save" size={16} className="mr-2" />保存</>
              )}
            </Button>
          </div>

          {/* Help */}
          <div className="pt-3 border-t">
            <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ExternalLink className="h-4 w-4" />
              LINE Developers Console を開く
            </a>
          </div>
        </CardContent>
      </Card>

      <LineSetupWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onComplete={() => loadSettings()}
      />
    </>
  );
}
