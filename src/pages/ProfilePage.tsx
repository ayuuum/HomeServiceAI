import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { CheckCircle2, XCircle, Loader2, Download, Printer, Upload, Trash2, Palette, User, Settings, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { QRCodeSVG } from 'qrcode.react';
import { LineSettingsForm } from '@/components/LineSettingsForm';

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

const emailChangeSchema = z.object({
  newEmail: z.string().email({ message: "有効なメールアドレスを入力してください" }),
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
  const [newEmail, setNewEmail] = useState('');
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  
  // Organization settings state
  const [organizationName, setOrganizationName] = useState('');
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [slugError, setSlugError] = useState('');

  // Branding settings state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState('#1E3A8A');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [bookingHeadline, setBookingHeadline] = useState('');
  const [headerLayout, setHeaderLayout] = useState<'logo_only' | 'logo_and_name' | 'name_only'>('logo_and_name');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // QR Code ref
  const qrRef = useRef<HTMLDivElement>(null);
  
  // Generate booking page URL
  const bookingPageUrl = organization?.slug 
    ? `${window.location.origin}/booking/${organization.slug}`
    : '';

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
      // Load branding settings
      setLogoUrl(organization.logo_url || null);
      setBrandColor(organization.brand_color || '#1E3A8A');
      setWelcomeMessage(organization.welcome_message || '');
      setBookingHeadline((organization as any).booking_headline || '');
      setHeaderLayout((organization.header_layout as 'logo_only' | 'logo_and_name' | 'name_only') || 'logo_and_name');
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

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailChangeSchema.parse({ newEmail });
      setIsLoadingEmail(true);

      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) throw error;

      setNewEmail('');
      toast({
        title: "確認メール送信",
        description: "新しいメールアドレスに確認メールを送信しました。メール内のリンクをクリックして変更を完了してください。",
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
          description: error instanceof Error ? error.message : "メールアドレス変更に失敗しました",
        });
      }
    } finally {
      setIsLoadingEmail(false);
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

  // Branding handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "ファイルサイズエラー",
        description: "ファイルサイズは2MB以下にしてください",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "ファイル形式エラー",
        description: "画像ファイルを選択してください",
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo.${fileExt}`;
      const filePath = `${organization?.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(filePath);

      // Add timestamp to bust cache
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      setLogoUrl(urlWithTimestamp);

      // Save to organization
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: urlWithTimestamp })
        .eq('id', organization?.id);

      if (updateError) throw updateError;

      await refreshOrganization();
      toast({
        title: "アップロード完了",
        description: "ロゴ画像をアップロードしました",
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({
        variant: "destructive",
        title: "アップロード失敗",
        description: error instanceof Error ? error.message : "ロゴのアップロードに失敗しました",
      });
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    if (!logoUrl || !organization?.id) return;

    setIsUploadingLogo(true);
    try {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('organization-logos')
        .remove([`${organization.id}/logo.png`, `${organization.id}/logo.jpg`, `${organization.id}/logo.jpeg`, `${organization.id}/logo.webp`]);

      // Update organization (clear logo_url)
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: null })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      setLogoUrl(null);
      await refreshOrganization();
      toast({
        title: "削除完了",
        description: "ロゴ画像を削除しました",
      });
    } catch (error) {
      console.error('Logo delete error:', error);
      toast({
        variant: "destructive",
        title: "削除失敗",
        description: error instanceof Error ? error.message : "ロゴの削除に失敗しました",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleBrandingUpdate = async () => {
    setIsSavingBranding(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          brand_color: brandColor,
          welcome_message: welcomeMessage || null,
          booking_headline: bookingHeadline || null,
          header_layout: headerLayout,
        })
        .eq('id', organization?.id);

      if (error) throw error;

      await refreshOrganization();
      toast({
        title: "更新完了",
        description: "ブランディング設定を更新しました",
      });
    } catch (error) {
      console.error('Branding update error:', error);
      toast({
        variant: "destructive",
        title: "更新失敗",
        description: error instanceof Error ? error.message : "ブランディング設定の更新に失敗しました",
      });
    } finally {
      setIsSavingBranding(false);
    }
  };

  const COLOR_PRESETS = [
    { name: 'ネイビー', value: '#1E3A8A' },
    { name: 'ブルー', value: '#2563EB' },
    { name: 'グリーン', value: '#16A34A' },
    { name: 'オレンジ', value: '#EA580C' },
    { name: 'パープル', value: '#7C3AED' },
  ];

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 400;
    canvas.width = size;
    canvas.height = size + 80; // Extra space for text
    
    if (!ctx) return;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Convert SVG to image
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      
      // Add text below QR
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(organization?.name || '予約ページ', size / 2, size + 30);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText('上記QRコードを読み取ってご予約ください', size / 2, size + 55);
      
      // Download
      const link = document.createElement('a');
      link.download = `qr-code-${organization?.slug || 'booking'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };
  
  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "印刷ウィンドウを開けませんでした",
      });
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QRコード - ${organization?.name || '予約'}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
              border: 2px solid #e5e5e5;
              border-radius: 16px;
            }
            .qr-code {
              width: 300px;
              height: 300px;
            }
            h1 {
              margin: 24px 0 8px;
              font-size: 24px;
              color: #333;
            }
            p {
              margin: 0;
              color: #666;
              font-size: 16px;
            }
            .url {
              margin-top: 16px;
              font-size: 12px;
              color: #999;
              word-break: break-all;
            }
            @media print {
              .qr-container {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${qrRef.current?.innerHTML || ''}
            <h1>${organization?.name || '予約ページ'}</h1>
            <p>上記QRコードを読み取ってご予約ください</p>
            <p class="url">${bookingPageUrl}</p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <AdminHeader />
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-lg md:text-xl font-bold">設定</h1>
          <p className="text-sm text-muted-foreground mt-1">アカウント情報・組織設定の管理</p>
        </div>

        <Tabs defaultValue="booking" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="booking" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">予約ページ</span>
              <span className="sm:hidden">予約</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">アカウント</span>
              <span className="sm:hidden">設定</span>
            </TabsTrigger>
            <TabsTrigger value="line" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">LINE連携</span>
              <span className="sm:hidden">LINE</span>
            </TabsTrigger>
          </TabsList>

          {/* 予約ページタブ */}
          <TabsContent value="booking" className="space-y-6">
            {/* QR Code Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="qr_code" size={24} />
                  予約ページQRコード
                </CardTitle>
                <CardDescription>店舗に掲示してお客様に予約ページを案内できます</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6 md:items-start">
                  <div 
                    ref={qrRef}
                    className="bg-white p-3 md:p-4 rounded-lg border shadow-sm shrink-0"
                  >
                    {bookingPageUrl ? (
                      <QRCodeSVG
                        value={bookingPageUrl}
                        size={160}
                        level="H"
                        includeMargin={true}
                        className="md:w-[200px] md:h-[200px]"
                      />
                    ) : (
                      <div className="w-[160px] h-[160px] md:w-[200px] md:h-[200px] flex items-center justify-center bg-muted rounded">
                        <p className="text-xs md:text-sm text-muted-foreground text-center p-4">
                          組織設定を完了するとQRコードが表示されます
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3 md:space-y-4 w-full">
                    <div>
                      <Label className="text-xs md:text-sm text-muted-foreground">予約ページURL</Label>
                      <p className="text-xs md:text-sm font-mono bg-muted px-2 md:px-3 py-2 rounded mt-1 break-all">
                        {bookingPageUrl || '未設定'}
                      </p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDownloadQR}
                        disabled={!bookingPageUrl}
                        className="w-full md:w-auto"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        ダウンロード
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handlePrintQR}
                        disabled={!bookingPageUrl}
                        className="w-full md:w-auto"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        印刷
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(bookingPageUrl);
                          toast({
                            title: "コピーしました",
                            description: "URLをクリップボードにコピーしました",
                          });
                        }}
                        disabled={!bookingPageUrl}
                        className="w-full md:w-auto"
                      >
                        <Icon name="content_copy" size={16} className="mr-2" />
                        コピー
                      </Button>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      ダウンロードした画像を印刷して店舗のカウンターや入口に掲示してください
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Branding Settings Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  ブランディング設定
                </CardTitle>
                <CardDescription>予約ページの見た目をカスタマイズできます</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-3">
                  <Label>ロゴ画像</Label>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="w-48 h-20 bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt="ロゴ" 
                          className="max-w-full max-h-full object-contain p-2"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">未設定</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        画像をアップロード
                      </Button>
                      {logoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleDeleteLogo}
                          disabled={isUploadingLogo}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          削除
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        推奨: 200x60px、2MB以下
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Brand Color */}
                <div className="space-y-3">
                  <Label>ブランドカラー</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setBrandColor(preset.value)}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          brandColor === preset.value 
                            ? 'border-foreground ring-2 ring-foreground ring-offset-2' 
                            : 'border-transparent hover:border-muted-foreground'
                        }`}
                        style={{ backgroundColor: preset.value }}
                        title={preset.name}
                      />
                    ))}
                    <div className="flex items-center gap-2 ml-2">
                      <Label htmlFor="customColor" className="text-sm text-muted-foreground">カスタム:</Label>
                      <Input
                        id="customColor"
                        type="text"
                        value={brandColor}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                            setBrandColor(value);
                          }
                        }}
                        className="w-24 font-mono text-sm"
                        placeholder="#1E3A8A"
                      />
                      <div 
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: brandColor }}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Header Layout */}
                <div className="space-y-3">
                  <Label>ヘッダー表示形式</Label>
                  <div className="space-y-2">
                    {[
                      { value: 'logo_only', label: 'ロゴのみ', description: 'ロゴ画像だけを表示' },
                      { value: 'logo_and_name', label: 'ロゴ + 組織名', description: '推奨：ロゴと組織名を両方表示' },
                      { value: 'name_only', label: '組織名のみ', description: '組織名をテキストで大きく表示' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          headerLayout === option.value 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        <input
                          type="radio"
                          name="headerLayout"
                          value={option.value}
                          checked={headerLayout === option.value}
                          onChange={(e) => setHeaderLayout(e.target.value as 'logo_only' | 'logo_and_name' | 'name_only')}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Booking Headline */}
                <div className="space-y-3">
                  <Label htmlFor="bookingHeadline">見出しテキスト</Label>
                  <Input
                    id="bookingHeadline"
                    value={bookingHeadline}
                    onChange={(e) => setBookingHeadline(e.target.value)}
                    placeholder={`${organization?.name || '店舗名'}で簡単予約`}
                  />
                  <p className="text-xs text-muted-foreground">
                    空欄の場合「{organization?.name || '店舗名'}で簡単予約」が表示されます
                  </p>
                </div>

                <Separator />

                {/* Welcome Message */}
                <div className="space-y-3">
                  <Label htmlFor="welcomeMessage">ウェルカムメッセージ</Label>
                  <Textarea
                    id="welcomeMessage"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="サービスを選んで、日時を選ぶだけ。見積もり不要、すぐに予約完了できます。"
                    className="resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    予約ページのヒーローセクションに表示されます
                  </p>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm font-medium mb-2">プレビュー</p>
                  <div 
                    className="p-4 rounded-lg"
                    style={{ 
                      background: `linear-gradient(to bottom, ${brandColor}15, transparent)` 
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {headerLayout === 'name_only' ? (
                        <span 
                          className="text-base font-bold"
                          style={{ color: brandColor }}
                        >
                          {organization?.name || '店舗名'}
                        </span>
                      ) : (
                        <>
                          {logoUrl ? (
                            <img src={logoUrl} alt="ロゴ" className="h-6 max-w-[100px] object-contain" />
                          ) : (
                            <div className="h-6 w-20 bg-muted rounded" />
                          )}
                          {headerLayout === 'logo_and_name' && (
                            <span className="text-sm text-muted-foreground">| {organization?.name || '店舗名'}</span>
                          )}
                        </>
                      )}
                    </div>
                    <p 
                      className="text-lg font-bold"
                      style={{ color: brandColor }}
                    >
                      {bookingHeadline || `${organization?.name || '店舗名'}で簡単予約`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {welcomeMessage || 'サービスを選んで、日時を選ぶだけ。'}
                    </p>
                  </div>
                </div>

                <Button 
                  type="button"
                  onClick={handleBrandingUpdate}
                  disabled={isSavingBranding}
                >
                  {isSavingBranding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    'ブランディング設定を保存'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Organization Settings */}
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
          </TabsContent>

          {/* アカウントタブ */}
          <TabsContent value="account" className="space-y-6">
            {/* Profile Info */}
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

            {/* Password Change */}
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

            {/* Email Change */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="mail" size={20} />
                  メールアドレス変更
                </CardTitle>
                <CardDescription>ログインに使用するメールアドレスを変更します</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label>現在のメールアドレス</Label>
                    <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                      {user?.email || '未設定'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newEmail">新しいメールアドレス</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="new@example.com"
                      disabled={isLoadingEmail}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Icon name="info" size={16} />
                    <span>確認メールが新しいアドレスに送信されます</span>
                  </div>
                  <Button type="submit" disabled={isLoadingEmail || !newEmail}>
                    {isLoadingEmail ? (
                      <>
                        <Icon name="sync" size={16} className="mr-2 animate-spin" />
                        送信中...
                      </>
                    ) : (
                      'メールアドレスを変更'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LINE連携タブ */}
          <TabsContent value="line">
            <LineSettingsForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
