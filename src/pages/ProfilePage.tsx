import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@/components/ui/icon';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { AdminHeader } from '@/components/AdminHeader';
import { MobileNav } from '@/components/MobileNav';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

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

const slugSchema = z.string()
  .min(3, { message: "3文字以上で入力してください" })
  .max(50, { message: "50文字以内で入力してください" })
  .regex(/^[a-z0-9-]+$/, { message: "英小文字、数字、ハイフンのみ使用可能です" })
  .refine((val) => !['admin', 'api', 'booking', 'login', 'signup', 'profile', 'settings'].includes(val), {
    message: "この名前は予約されています",
  });

const RESERVED_SLUGS = ['admin', 'api', 'booking', 'login', 'signup', 'profile', 'settings'];

export default function ProfilePage() {
  const { user, organization, refreshOrganization } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  
  // Organization settings state
  const [organizationName, setOrganizationName] = useState('');
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [slugError, setSlugError] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      loadProfile();
    }
  }, [user]);

  useEffect(() => {
    if (organization) {
      setOrganizationName(organization.name);
      setSlug(organization.slug);
      setOriginalSlug(organization.slug);
    }
  }, [organization]);

  // Debounced slug availability check
  useEffect(() => {
    if (!slug || slug === originalSlug) {
      setSlugStatus('idle');
      setSlugError('');
      return;
    }

    // Validate slug format first
    const result = slugSchema.safeParse(slug);
    if (!result.success) {
      setSlugStatus('invalid');
      setSlugError(result.error.errors[0].message);
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', slug)
          .neq('id', organization?.id || '')
          .maybeSingle();

        if (data) {
          setSlugStatus('taken');
          setSlugError('このURLは既に使用されています');
        } else {
          setSlugStatus('available');
          setSlugError('');
        }
      } catch (error) {
        console.error('Slug check error:', error);
        setSlugStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [slug, originalSlug, organization?.id]);

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

  const handleOrganizationUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // If slug changed, validate it
    if (slug !== originalSlug) {
      const result = slugSchema.safeParse(slug);
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "入力エラー",
          description: result.error.errors[0].message,
        });
        return;
      }

      if (slugStatus === 'taken') {
        toast({
          variant: "destructive",
          title: "入力エラー",
          description: "このURLは既に使用されています",
        });
        return;
      }

      if (slugStatus === 'checking') {
        toast({
          variant: "destructive",
          title: "確認中",
          description: "URLの確認中です。しばらくお待ちください",
        });
        return;
      }
    }

    try {
      setIsLoadingOrganization(true);

      const { error } = await supabase
        .from('organizations')
        .update({ 
          name: organizationName.trim(),
          slug: slug.toLowerCase().trim()
        })
        .eq('id', organization?.id);

      if (error) throw error;

      setOriginalSlug(slug);
      await refreshOrganization();

      toast({
        title: "更新成功",
        description: "組織設定を更新しました",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "更新失敗",
        description: error instanceof Error ? error.message : "組織設定の更新に失敗しました",
      });
    } finally {
      setIsLoadingOrganization(false);
    }
  };

  const handleSlugChange = (value: string) => {
    // Convert to lowercase and replace invalid characters
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(sanitized);
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
                      <Icon name="sync" size={16} className="mr-2 animate-spin" />
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
              <CardTitle>組織設定</CardTitle>
              <CardDescription>予約ページのURLを管理します</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOrganizationUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">組織名</Label>
                  <Input
                    id="organizationName"
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    disabled={isLoadingOrganization}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">予約ページURL</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">/booking/</span>
                    <div className="relative flex-1">
                      <Input
                        id="slug"
                        type="text"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        disabled={isLoadingOrganization}
                        className={`pr-10 ${
                          slugStatus === 'taken' || slugStatus === 'invalid' 
                            ? 'border-destructive focus-visible:ring-destructive' 
                            : slugStatus === 'available' 
                            ? 'border-green-500 focus-visible:ring-green-500' 
                            : ''
                        }`}
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {slugStatus === 'checking' && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {slugStatus === 'available' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {(slugStatus === 'taken' || slugStatus === 'invalid') && (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>
                  </div>
                  {slugError ? (
                    <p className="text-sm text-destructive">{slugError}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      英小文字、数字、ハイフンのみ使用可能（例: tanaka-cleaning）
                    </p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoadingOrganization || slugStatus === 'taken' || slugStatus === 'invalid' || slugStatus === 'checking'}
                >
                  {isLoadingOrganization ? (
                    <>
                      <Icon name="sync" size={16} className="mr-2 animate-spin" />
                      更新中...
                    </>
                  ) : (
                    '組織設定を保存'
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
                      <Icon name="sync" size={16} className="mr-2 animate-spin" />
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
