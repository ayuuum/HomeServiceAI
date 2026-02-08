import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ServiceTemplateSelector } from './ServiceTemplateSelector';
import { BusinessHoursSettings } from '@/components/BusinessHoursSettings';
import { ServiceTemplate } from './serviceTemplates';
import {
    Phone,
    MapPin,
    ListChecks,
    Clock,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Loader2,
    PartyPopper,
    QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import authLogo from '@/assets/auth-logo.png';

type Step = 'basicInfo' | 'services' | 'businessHours' | 'complete';

const STEPS: { id: Step; title: string; description: string }[] = [
    { id: 'basicInfo', title: '店舗情報', description: '電話番号を登録' },
    { id: 'services', title: 'サービス登録', description: 'メニューを追加' },
    { id: 'businessHours', title: '営業時間', description: '受付時間を設定' },
    { id: 'complete', title: '完了', description: '予約受付開始！' },
];

interface OnboardingWizardProps {
    onComplete?: () => void;
    onSkip?: () => void;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
    const { organization, organizationId, refreshOrganization } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState<Step>('basicInfo');
    const [isLoading, setIsLoading] = useState(false);

    // Form state
    const [phone, setPhone] = useState((organization as any)?.phone || '');
    const [address, setAddress] = useState((organization as any)?.address || '');
    const [selectedTemplates, setSelectedTemplates] = useState<ServiceTemplate[]>([]);
    const [businessHours, setBusinessHours] = useState<Record<string, any>>(
        (organization as any)?.business_hours || {}
    );

    const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
    const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

    const handleNext = async () => {
        setIsLoading(true);
        try {
            if (currentStep === 'basicInfo') {
                // Validate phone
                if (!phone.trim()) {
                    toast({
                        variant: 'destructive',
                        title: '入力エラー',
                        description: '電話番号を入力してください',
                    });
                    setIsLoading(false);
                    return;
                }

                // Save phone and address (cast to any for new columns not in types yet)
                const { error } = await supabase
                    .from('organizations')
                    .update({
                        phone: phone.trim(),
                        address: address.trim() || null
                    } as any)
                    .eq('id', organizationId);

                if (error) throw error;
                await refreshOrganization();
                setCurrentStep('services');
            } else if (currentStep === 'services') {
                // Validate services
                if (selectedTemplates.length === 0) {
                    toast({
                        variant: 'destructive',
                        title: '入力エラー',
                        description: '少なくとも1つのサービスを選択してください',
                    });
                    setIsLoading(false);
                    return;
                }

                // Create services from templates
                const servicesToCreate = selectedTemplates.map(template => ({
                    organization_id: organizationId,
                    title: template.title,
                    description: template.description,
                    base_price: template.basePrice,
                    duration: template.duration,
                    category: template.category,
                    image_url: '', // Required field
                }));

                const { error } = await supabase
                    .from('services')
                    .insert(servicesToCreate as any);

                if (error) throw error;
                setCurrentStep('businessHours');
            } else if (currentStep === 'businessHours') {
                // Save business hours (cast to any for new columns not in types yet)
                const { error } = await supabase
                    .from('organizations')
                    .update({
                        business_hours: businessHours,
                        booking_page_status: 'published',
                        onboarding_completed_at: new Date().toISOString()
                    } as any)
                    .eq('id', organizationId);

                if (error) throw error;
                await refreshOrganization();
                setCurrentStep('complete');
            } else if (currentStep === 'complete') {
                onComplete?.();
                navigate('/admin');
            }
        } catch (error) {
            console.error('Error saving:', error);
            toast({
                variant: 'destructive',
                title: 'エラー',
                description: '保存に失敗しました。もう一度お試しください。',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        const stepOrder: Step[] = ['basicInfo', 'services', 'businessHours', 'complete'];
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex > 0) {
            setCurrentStep(stepOrder[currentIndex - 1]);
        }
    };

    const handleSkip = () => {
        onSkip?.();
        navigate('/admin');
    };

    const bookingPageUrl = organization?.slug
        ? `${window.location.origin}/booking/${organization.slug}`
        : '';

    const handleCustomizePrice = (templateId: string, price: number) => {
        setSelectedTemplates(prev =>
            prev.map(t => (t.id === templateId ? { ...t, basePrice: price } : t))
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl shadow-xl">
                <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                        <img src={authLogo} alt="Logo" className="h-12 w-12" />
                    </div>
                    <CardTitle className="text-xl">予約受付の準備</CardTitle>
                    <CardDescription>
                        3ステップで予約ページを公開できます
                    </CardDescription>

                    {/* Progress */}
                    <div className="mt-4">
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between mt-2">
                            {STEPS.map((step, index) => (
                                <div
                                    key={step.id}
                                    className={`flex flex-col items-center ${index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                                        }`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${index < currentStepIndex
                                            ? 'bg-primary text-primary-foreground'
                                            : index === currentStepIndex
                                                ? 'bg-primary/20 text-primary border-2 border-primary'
                                                : 'bg-muted'
                                            }`}
                                    >
                                        {index < currentStepIndex ? (
                                            <CheckCircle2 className="h-5 w-5" />
                                        ) : (
                                            index + 1
                                        )}
                                    </div>
                                    <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0">
                    {/* Step 1: Basic Info */}
                    {currentStep === 'basicInfo' && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-3">
                                    <Phone className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="font-semibold text-lg">店舗情報を登録</h3>
                                <p className="text-sm text-muted-foreground">
                                    お客様からの問い合わせ先として表示されます
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">
                                        電話番号 <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="例: 03-1234-5678"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">住所（任意）</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="address"
                                            type="text"
                                            placeholder="例: 東京都渋谷区..."
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        出張型サービスの場合は不要です
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Services */}
                    {currentStep === 'services' && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-3">
                                    <ListChecks className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="font-semibold text-lg">提供サービスを選択</h3>
                                <p className="text-sm text-muted-foreground">
                                    お客様が予約できるメニューを選んでください
                                </p>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto pr-2">
                                <ServiceTemplateSelector
                                    selectedTemplates={selectedTemplates}
                                    onSelectionChange={setSelectedTemplates}
                                    onCustomizePrice={handleCustomizePrice}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Business Hours */}
                    {currentStep === 'businessHours' && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-3">
                                    <Clock className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="font-semibold text-lg">営業時間を設定</h3>
                                <p className="text-sm text-muted-foreground">
                                    予約を受け付ける時間帯を設定してください
                                </p>
                            </div>

                            <BusinessHoursSettings
                                organizationId={organizationId}
                            />
                        </div>
                    )}

                    {/* Step 4: Complete */}
                    {currentStep === 'complete' && (
                        <div className="space-y-6 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                                <PartyPopper className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="font-semibold text-xl">準備完了！</h3>
                            <p className="text-muted-foreground">
                                予約ページが公開されました。QRコードを印刷して店舗に掲示しましょう。
                            </p>

                            {bookingPageUrl && (
                                <div className="flex flex-col items-center gap-4 py-6">
                                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                                        <QRCodeSVG value={bookingPageUrl} size={160} level="H" />
                                    </div>
                                    <p className="text-sm font-mono text-muted-foreground break-all max-w-sm">
                                        {bookingPageUrl}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t">
                        <div>
                            {currentStep !== 'basicInfo' && currentStep !== 'complete' && (
                                <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    戻る
                                </Button>
                            )}
                            {currentStep === 'basicInfo' && (
                                <Button variant="ghost" onClick={handleSkip} disabled={isLoading}>
                                    後で設定する
                                </Button>
                            )}
                        </div>

                        <Button onClick={handleNext} disabled={isLoading}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {currentStep === 'complete' ? (
                                'ダッシュボードへ'
                            ) : (
                                <>
                                    次へ
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
