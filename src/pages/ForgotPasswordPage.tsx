import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください" }),
});

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validatedData = emailSchema.parse({ email });
      setIsLoading(true);

      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "メール送信完了",
        description: "パスワードリセット用のリンクをメールで送信しました",
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
          title: "送信失敗",
          description: error instanceof Error ? error.message : "メール送信に失敗しました",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">パスワードリセット</CardTitle>
          <CardDescription>
            登録されているメールアドレスを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!emailSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Icon name="sync" className="mr-2 animate-spin" size={16} />
                    送信中...
                  </>
                ) : (
                  'リセットリンクを送信'
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                パスワードリセット用のリンクをメールで送信しました。メールボックスをご確認ください。
              </p>
              <Button asChild className="w-full">
                <Link to="/login">ログインページに戻る</Link>
              </Button>
            </div>
          )}
          <div className="mt-4 text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              ログインページに戻る
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
