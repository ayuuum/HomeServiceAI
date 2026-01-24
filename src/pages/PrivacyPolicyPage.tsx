import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. はじめに</h2>
            <p className="text-muted-foreground leading-relaxed">
              ハウクリPro（以下「当サービス」）は、お客様の個人情報の保護を重要な責務と考え、
              個人情報の取り扱いについて以下のとおりプライバシーポリシーを定めます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. 収集する情報</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              当サービスでは、以下の情報を収集することがあります：
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>氏名</li>
              <li>メールアドレス</li>
              <li>電話番号</li>
              <li>住所</li>
              <li>予約情報</li>
              <li>サービス利用履歴</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. 情報の利用目的</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              収集した個人情報は、以下の目的で利用いたします：
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>サービスの提供および運営</li>
              <li>予約の確認・変更・キャンセルに関する連絡</li>
              <li>お客様からのお問い合わせへの対応</li>
              <li>サービスの改善および新サービスの開発</li>
              <li>重要なお知らせの送信</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. 情報の第三者提供</h2>
            <p className="text-muted-foreground leading-relaxed">
              当サービスは、法令に基づく場合を除き、お客様の同意なく個人情報を第三者に提供することはありません。
              ただし、サービス提供に必要な範囲で業務委託先に情報を共有する場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. 情報の管理</h2>
            <p className="text-muted-foreground leading-relaxed">
              当サービスは、お客様の個人情報を適切に管理し、不正アクセス、紛失、破壊、
              改ざん、漏洩などを防止するため、必要かつ適切なセキュリティ対策を講じます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Cookieの使用</h2>
            <p className="text-muted-foreground leading-relaxed">
              当サービスでは、サービスの利便性向上のためにCookieを使用することがあります。
              ブラウザの設定によりCookieを無効にすることができますが、一部のサービスが
              正常に動作しなくなる可能性があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. お問い合わせ・開示請求</h2>
            <p className="text-muted-foreground leading-relaxed">
              ご自身の個人情報の開示、訂正、削除をご希望の場合は、当サービスまでお問い合わせください。
              本人確認の上、合理的な期間内に対応いたします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. ポリシーの変更</h2>
            <p className="text-muted-foreground leading-relaxed">
              当サービスは、必要に応じて本プライバシーポリシーを変更することがあります。
              重要な変更がある場合は、サービス上でお知らせいたします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. お問い合わせ先</h2>
            <p className="text-muted-foreground leading-relaxed">
              本ポリシーに関するお問い合わせは、当サービスの問い合わせフォームよりご連絡ください。
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8 pt-4 border-t">
            最終更新日: 2024年1月
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
