import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Icon } from '@/components/ui/icon';

interface StoreFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: any;
  onSuccess: () => void;
}

export default function StoreFormModal({ open, onOpenChange, store, onSuccess }: StoreFormModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [lineChannelToken, setLineChannelToken] = useState('');
  const [lineChannelSecret, setLineChannelSecret] = useState('');
  const [isHq, setIsHq] = useState(false);

  useEffect(() => {
    if (store && open) {
      setName(store.name);
      setLineChannelToken(store.line_channel_token || '');
      setLineChannelSecret(store.line_channel_secret || '');
      setIsHq(store.is_hq);
    } else if (!store && open) {
      setName('');
      setLineChannelToken('');
      setLineChannelSecret('');
      setIsHq(false);
    }
  }, [store, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const storeData = {
        name,
        line_channel_token: lineChannelToken || null,
        line_channel_secret: lineChannelSecret || null,
        is_hq: isHq,
      };

      if (store) {
        const { error } = await supabase
          .from('stores')
          .update(storeData)
          .eq('id', store.id);

        if (error) throw error;

        toast({
          title: "更新完了",
          description: "店舗情報を更新しました",
        });
      } else {
        const { error } = await supabase
          .from('stores')
          .insert(storeData);

        if (error) throw error;

        toast({
          title: "登録完了",
          description: "新しい店舗を登録しました",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('店舗保存エラー:', error);
      toast({
        variant: "destructive",
        title: "保存失敗",
        description: error instanceof Error ? error.message : "店舗の保存に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{store ? '店舗編集' : '新規店舗登録'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">店舗名</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lineChannelToken">LINE Channel Token</Label>
            <Input
              id="lineChannelToken"
              value={lineChannelToken}
              onChange={(e) => setLineChannelToken(e.target.value)}
              placeholder="オプション"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lineChannelSecret">LINE Channel Secret</Label>
            <Input
              id="lineChannelSecret"
              value={lineChannelSecret}
              onChange={(e) => setLineChannelSecret(e.target.value)}
              placeholder="オプション"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isHq"
              checked={isHq}
              onCheckedChange={setIsHq}
            />
            <Label htmlFor="isHq">本部として設定</Label>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Icon name="sync" size={16} className="mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                store ? '更新' : '登録'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
