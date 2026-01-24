import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-8">利用規約</h1>

        <div className="prose prose-gray max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">第1条（適用）</h2>
            <p className="text-muted-foreground leading-relaxed">
              本規約は、ハウクリPro（以下「当サービス」）の利用に関する条件を定めるものです。
              ユーザーは本規約に同意の上、当サービスをご利用ください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第2条（サービス内容）</h2>
            <p className="text-muted-foreground leading-relaxed">
              当サービスは、ハウスクリーニングおよび関連サービスの予約管理システムを提供します。
              サービスの内容は、予告なく変更・追加・削除されることがあります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第3条（利用登録）</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              当サービスの一部機能を利用するには、利用登録が必要です。
              登録にあたり、以下の事項に同意いただきます：
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>正確かつ最新の情報を提供すること</li>
              <li>登録情報に変更があった場合は速やかに更新すること</li>
              <li>アカウント情報を適切に管理すること</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第4条（禁止事項）</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              ユーザーは、以下の行為を行ってはなりません：
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>法令または公序良俗に違反する行為</li>
              <li>当サービスの運営を妨害する行為</li>
              <li>他のユーザーまたは第三者の権利を侵害する行為</li>
              <li>虚偽の情報を登録・送信する行為</li>
              <li>不正アクセスまたはそれを試みる行為</li>
              <li>当サービスを営利目的で無断使用する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第5条（予約・キャンセル）</h2>
            <p className="text-muted-foreground leading-relaxed">
              予約の確定、変更、キャンセルについては、各サービス提供事業者が定める条件に従うものとします。
              キャンセル料が発生する場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第6条（知的財産権）</h2>
            <p className="text-muted-foreground leading-relaxed">
              当サービスに関するすべての知的財産権は、当社または正当な権利者に帰属します。
              ユーザーは、当サービスのコンテンツを無断で複製、転載、改変することはできません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第7条（免責事項）</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              当サービスは以下について責任を負いません：
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>サービスの中断、遅延、停止による損害</li>
              <li>ユーザー間またはユーザーと第三者との間のトラブル</li>
              <li>システム障害やセキュリティ問題による損害</li>
              <li>ユーザーの過失による情報漏洩</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第8条（サービスの変更・終了）</h2>
            <p className="text-muted-foreground leading-relaxed">
              当サービスは、事前の通知なくサービス内容の変更または終了を行うことがあります。
              これによりユーザーに生じた損害について、当サービスは責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第9条（利用規約の変更）</h2>
            <p className="text-muted-foreground leading-relaxed">
              当サービスは、必要に応じて本規約を変更することがあります。
              変更後の規約は、当サービス上に掲載した時点で効力を生じます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">第10条（準拠法・管轄）</h2>
            <p className="text-muted-foreground leading-relaxed">
              本規約の解釈および適用は日本法に準拠します。
              当サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
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

export default TermsOfServicePage;
