import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import authLogo from '@/assets/auth-logo.png';

const loginSchema = z.object({
  email: z.string().trim().email({ message: "有効なメールアドレスを入力してください" }),
  password: z.string().trim().min(1, { message: "パスワードを入力してください" }),
});

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const { signIn, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isExiting) {
      setIsExiting(true);
      // Wait for animation to complete before navigating
      setTimeout(() => {
        navigate('/admin', { replace: true });
      }, 400);
    }
  }, [user, navigate, isExiting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({
        title: "入力エラー",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await signIn(email, password);

    if (error) {
      let errorMessage = "ログインに失敗しました";

      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "メールアドレスまたはパスワードが正しくありません";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "メールアドレスの確認が完了していません";
      }

      toast({
        title: "ログインエラー",
        description: errorMessage,
        variant: "destructive",
      });
      setIsSubmitting(false);
    } else {
      toast({
        title: "ログイン成功",
        description: "管理画面にリダイレクトしています...",
      });
      // Navigation will happen via useEffect when user state updates
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-opacity duration-400 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      {/* Background with gradient circles */}
      <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 transition-all duration-500 ${isExiting ? 'scale-110' : 'scale-100'}`} />
      <div className={`absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${isExiting ? 'scale-150 opacity-0' : ''}`} />
      <div className={`absolute bottom-0 right-0 w-96 h-96 bg-primary/15 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 transition-all duration-500 ${isExiting ? 'scale-150 opacity-0' : ''}`} />
      <div className={`absolute top-1/2 left-1/2 w-64 h-64 bg-accent/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${isExiting ? 'scale-150 opacity-0' : ''}`} />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <Card className={`w-full max-w-md shadow-2xl border-border/50 backdrop-blur-sm bg-card/95 relative z-10 transition-all duration-400 ${isExiting ? 'scale-95 opacity-0 translate-y-4' : 'scale-100 opacity-100 translate-y-0'}`}>
        <CardHeader className="space-y-4 text-center pb-2">
          {/* Logo and Brand */}
          <div className="flex flex-col items-center gap-3">
            <img src={authLogo} alt="Logo" className="w-20 h-20 object-contain" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Haukuri Pro</h1>
              <p className="text-sm text-muted-foreground mt-1">ビジネス管理システム</p>
            </div>
          </div>
          
          {/* Service Description */}
          <div className="bg-muted/50 rounded-lg p-4 text-left border border-border/50">
            <p className="text-sm font-medium text-foreground">予約管理をシンプルに</p>
            <p className="text-xs text-muted-foreground mt-1">
              予約・顧客・スケジュールを一元管理。ビジネスの効率化を実現します。
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                メールアドレス <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="例：taro.yamada@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="pl-10 h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                パスワード <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="pl-10 pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ログイン中...
                </>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">
                または
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            type="button"
            className="w-full h-11 font-medium hover:bg-muted/50 transition-all"
            disabled={isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              const { error } = await signInWithGoogle();
              if (error) {
                toast({
                  title: "ログインエラー",
                  description: error.message,
                  variant: "destructive",
                });
                setIsSubmitting(false);
              }
            }}
          >
            <svg className="mr-2 h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Googleでログイン
          </Button>

          <div className="mt-6 flex flex-col items-center gap-2 text-sm">
            <div className="text-muted-foreground">
              アカウントをお持ちでないですか？{' '}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                新規登録
              </Link>
            </div>
            <Link to="/forgot-password" className="text-muted-foreground hover:text-primary transition-colors">
              パスワードをお忘れの方
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}