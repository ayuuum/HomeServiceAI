import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";

interface LineIntegrationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storeId: string | null;
    onSuccess?: () => void;
}

export function LineIntegrationModal({ open, onOpenChange, storeId, onSuccess }: LineIntegrationModalProps) {
    const [channelToken, setChannelToken] = useState("");
    const [channelSecret, setChannelSecret] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Ideally, this should be dynamic based on the project URL
    const webhookUrl = "https://[YOUR_PROJECT_REF].functions.supabase.co/line-webhook";

    useEffect(() => {
        if (open && storeId) {
            fetchLineSettings();
        }
    }, [open, storeId]);

    const fetchLineSettings = async () => {
        if (!storeId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("stores")
                .select("line_channel_token, line_channel_secret")
                .eq("id", storeId)
                .single();

            if (error) throw error;

            if (data) {
                setChannelToken(data.line_channel_token || "");
                setChannelSecret(data.line_channel_secret || "");
            }
        } catch (error) {
            console.error("Error fetching LINE settings:", error);
            toast.error("設定の読み込みに失敗しました");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!storeId) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from("stores")
                .update({
                    line_channel_token: channelToken,
                    line_channel_secret: channelSecret,
                })
                .eq("id", storeId);

            if (error) throw error;

            toast.success("LINE設定を保存しました");
            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving LINE settings:", error);
            toast.error("設定の保存に失敗しました");
        } finally {
            setIsSaving(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        toast.success("Webhook URLをコピーしました");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>LINE Messaging API設定</DialogTitle>
                    <DialogDescription>
                        LINE Developersコンソールから取得した情報を入力してください。
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Icon name="sync" size={32} className="animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="channelToken">Channel Access Token (Long-lived)</Label>
                            <Input
                                id="channelToken"
                                value={channelToken}
                                onChange={(e) => setChannelToken(e.target.value)}
                                placeholder="長期アクセストークンを入力..."
                                className="font-mono text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="channelSecret">Channel Secret</Label>
                            <Input
                                id="channelSecret"
                                type="password"
                                value={channelSecret}
                                onChange={(e) => setChannelSecret(e.target.value)}
                                placeholder="Channel Secretを入力..."
                                className="font-mono text-sm"
                            />
                        </div>

                        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                            <Label className="text-xs text-muted-foreground">Webhook URL (LINE Developersに登録)</Label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-background p-2 rounded border text-xs font-mono break-all">
                                    {webhookUrl}
                                </code>
                                <Button variant="outline" size="icon" onClick={copyToClipboard} className="shrink-0">
                                    {copied ? <Icon name="check" size={16} className="text-success" /> : <Icon name="content_copy" size={16} />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                ※ このURLをLINE DevelopersのWebhook設定に登録し、「Webhookの利用」をオンにしてください。
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        キャンセル
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving && <Icon name="sync" size={16} className="mr-2 animate-spin" />}
                        保存する
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
