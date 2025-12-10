import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRoles {
  id: string;
  email: string | null;
  name: string | null;
  store_id: string | null;
  store_name: string | null;
  roles: string[];
  created_at: string;
}

interface UserEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles | null;
  stores: { id: string; name: string }[];
  onSuccess: () => void;
}

const availableRoles: { value: AppRole; label: string; description: string }[] = [
  { value: 'hq_admin', label: '本部管理者', description: '全店舗・全データにアクセス可能' },
  { value: 'store_owner', label: '店舗オーナー', description: '自店舗のデータを管理' },
  { value: 'store_staff', label: 'スタッフ', description: '自店舗の基本操作が可能' },
];

export function UserEditModal({ open, onOpenChange, user, stores, onSuccess }: UserEditModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    if (user) {
      setSelectedStoreId(user.store_id || '');
      setSelectedRoles(user.roles.filter((r): r is AppRole => 
        availableRoles.some(ar => ar.value === r)
      ));
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update store_id in profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ store_id: selectedStoreId || null })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Get current roles for this user
      const { data: currentRolesData, error: fetchError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      const currentRoles = currentRolesData?.map(r => r.role) || [];

      // Determine roles to add and remove
      const rolesToAdd = selectedRoles.filter(r => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter((r): r is AppRole => 
        availableRoles.some(ar => ar.value === r) && !selectedRoles.includes(r as AppRole)
      );

      // Add new roles
      if (rolesToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(rolesToAdd.map(role => ({ user_id: user.id, role })));

        if (insertError) throw insertError;
      }

      // Remove old roles
      for (const role of rolesToRemove) {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .eq('role', role);

        if (deleteError) throw deleteError;
      }

      toast({
        title: "保存完了",
        description: "ユーザー情報を更新しました",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('保存エラー:', error);
      toast({
        variant: "destructive",
        title: "保存失敗",
        description: error instanceof Error ? error.message : "ユーザー情報の更新に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRole = (role: AppRole) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>ユーザー編集</DialogTitle>
          <DialogDescription>
            {user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>所属店舗</Label>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="店舗を選択" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              ユーザーがアクセスできる店舗を選択します
            </p>
          </div>

          <div className="space-y-3">
            <Label>ロール</Label>
            {availableRoles.map((role) => (
              <div
                key={role.value}
                className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={role.value}
                  checked={selectedRoles.includes(role.value)}
                  onCheckedChange={() => toggleRole(role.value)}
                />
                <div className="space-y-1">
                  <label
                    htmlFor={role.value}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {role.label}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {role.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
