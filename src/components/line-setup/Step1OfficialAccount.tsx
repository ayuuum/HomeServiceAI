import { Button } from '@/components/ui/button';
import { ExternalLink, MessageSquare, ArrowRight, MessageCircle, Smartphone, Shield } from 'lucide-react';

interface Step1Props {
  onNext: () => void;
}

export function Step1OfficialAccount({ onNext }: Step1Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-[#06C755]/10 flex items-center justify-center mx-auto">
          <MessageSquare className="h-8 w-8 text-[#06C755]" />
        </div>
        <h3 className="text-lg font-semibold">LINE公式アカウントをお持ちですか？</h3>
        <p className="text-sm text-muted-foreground">
          LINE連携には公式アカウント（無料）が必要です
        </p>
      </div>

      {/* Overview of what will be set up */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">このウィザードで設定するもの:</p>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <MessageCircle className="h-3.5 w-3.5 text-[#06C755] flex-shrink-0" />
            <span><strong>Messaging API</strong> — メッセージの送受信に使用</span>
          </li>
          <li className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-[#06C755] flex-shrink-0" />
            <span><strong>Webhook</strong> — LINEからの通知を自動受信（自動設定）</span>
          </li>
          <li className="flex items-center gap-2">
            <Smartphone className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
            <span><strong>LIFF</strong>（任意）— LINEから予約画面を開く機能</span>
          </li>
        </ul>
      </div>

      <div className="space-y-3">
        <Button onClick={onNext} className="w-full h-12 bg-[#06C755] hover:bg-[#06C755]/90 text-white text-base">
          はい、持っています
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">または</span></div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-medium">まだお持ちでない方</p>
          <p className="text-xs text-muted-foreground">
            LINE公式アカウントは無料で作成できます。作成後にこのセットアップを続行してください。
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href="https://www.linebiz.com/jp/entry/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                LINE公式アカウントを作成
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
