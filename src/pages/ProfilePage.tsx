import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { AdminHeader } from '@/components/AdminHeader';
import { MobileNav } from '@/components/MobileNav';

const profileSchema = z.object({
  name: z.string().min(1, { message: "名前を入力してください" }),
  email: z.string().email({ message: "有効なメールアドレスを入力してください" }),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, { message: "パスワードは6文字以上で入力してください" }),
  newPassword: z.string().min(6, { message: "パスワードは6文字以上で入力してください" }),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setName(data.name || '');
      }
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = profileSchema.parse({ name, email });
      setIsLoadingProfile(true);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: validatedData.name, email: validatedData.email })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      toast({
        title: "更新成功",
        description: "プロフィールを更新しました",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "入力エラー",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "更新失敗",
          description: error instanceof Error ? error.message : "プロフィールの更新に失敗しました",
        });
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      passwordSchema.parse({ currentPassword, newPassword, confirmPassword });
      setIsLoadingPassword(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast({
        title: "パスワード変更完了",
        description: "パスワードを変更しました",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "入力エラー",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "変更失敗",
          description: error instanceof Error ? error.message : "パスワード変更に失敗しました",
        });
      }
    } finally {
      setIsLoadingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <AdminHeader />
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">プロフィール設定</h1>
          <p className="text-muted-foreground mt-2">アカウント情報の確認・変更</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>プロフィール情報</CardTitle>
              <CardDescription>名前とメールアドレスを管理します</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">名前</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoadingProfile}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoadingProfile}
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoadingProfile}>
                  {isLoadingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      更新中...
                    </>
                  ) : (
                    'プロフィールを更新'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>パスワード変更</CardTitle>
              <CardDescription>新しいパスワードを設定します</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">現在のパスワード</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isLoadingPassword}
                    required
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="newPassword">新しいパスワード</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoadingPassword}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoadingPassword}
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoadingPassword}>
                  {isLoadingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      変更中...
                    </>
                  ) : (
                    'パスワードを変更'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
