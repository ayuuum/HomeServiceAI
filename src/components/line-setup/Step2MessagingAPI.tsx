import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowRight, ArrowLeft, Settings } from 'lucide-react';

interface Step2Props {
  onNext: () => void;
  onBack: () => void;
}

export function Step2MessagingAPI({ onNext, onBack }: Step2Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Settings className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Messaging APIを有効にする</h3>
        <p className="text-sm text-muted-foreground">
          LINE Official Account Managerから有効化します
        </p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <p className="font-medium">LINE Official Account Managerにログイン</p>
              <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
                <a href="https://manager.line.biz/" target="_blank" rel="noopener noreferrer">
                  LINE OA Managerを開く <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <p className="font-medium">設定 → Messaging API を開く</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                「Messaging APIを利用する」をクリックしてください
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
            <div>
              <p className="font-medium">プロバイダーを選択（または新規作成）</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                任意の名前でOKです（例: 店舗名）
              </p>
            </div>
          </li>
        </ol>
      </div>

      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
        <p className="text-xs text-amber-700 dark:text-amber-400">
          💡 すでにMessaging APIが有効な場合は、このステップをスキップしてOKです
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1" />
          戻る
        </Button>
        <Button onClick={onNext} className="flex-1 bg-[#06C755] hover:bg-[#06C755]/90 text-white">
          完了しました、次へ
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
