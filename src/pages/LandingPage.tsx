import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, UserCheck, BarChart3, Clock, Zap, Heart, Mail } from "lucide-react";
import Footer from "@/components/Footer";

const LandingPage = () => {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/images/logo.png" 
              alt="ハウクリPro" 
              className="h-8 w-auto"
            />
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="sm">
              ログイン
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-primary py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
            ハウスクリーニング業務を、
            <br className="md:hidden" />
            もっとスマートに
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            予約受付・顧客管理・スケジュール調整を
            <br className="hidden md:block" />
            ワンストップで
          </p>
          <Button 
            size="lg" 
            className="bg-card text-primary hover:bg-card/90 font-semibold px-8 py-6 text-lg"
            onClick={scrollToContact}
          >
            お問い合わせ
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            主な機能
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <FeatureCard
              icon={<Calendar className="h-10 w-10" />}
              title="オンライン予約受付"
              description="お客様が24時間いつでもWeb予約。電話対応の手間を削減できます。"
            />
            <FeatureCard
              icon={<Users className="h-10 w-10" />}
              title="顧客管理（CRM）"
              description="顧客情報・予約履歴を一元管理。リピート促進に活用できます。"
            />
            <FeatureCard
              icon={<UserCheck className="h-10 w-10" />}
              title="スタッフ管理"
              description="スタッフのスケジュールをカレンダーで可視化。配置の最適化に。"
            />
            <FeatureCard
              icon={<BarChart3 className="h-10 w-10" />}
              title="売上レポート"
              description="売上・予約数を自動集計。経営判断をサポートします。"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            導入メリット
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <BenefitCard
              icon={<Zap className="h-8 w-8 text-primary" />}
              title="予約業務を効率化"
              description="電話・メール対応を削減。予約確認・リマインドも自動化。"
            />
            <BenefitCard
              icon={<Clock className="h-8 w-8 text-primary" />}
              title="24時間自動受付"
              description="営業時間外も予約を逃さない。機会損失を防止します。"
            />
            <BenefitCard
              icon={<Heart className="h-8 w-8 text-primary" />}
              title="顧客満足度向上"
              description="スムーズな予約体験で、リピート率アップに貢献。"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            導入のご相談はこちら
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            お気軽にお問い合わせください。デモのご案内も可能です。
          </p>
          <a href="mailto:contact@haukuripro.com">
            <Button size="lg" className="font-semibold px-8 py-6 text-lg gap-2">
              <Mail className="h-5 w-5" />
              お問い合わせ
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-6 text-center">
      <div className="text-primary mb-4 flex justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const BenefitCard = ({ icon, title, description }: BenefitCardProps) => (
  <div className="text-center">
    <div className="flex justify-center mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default LandingPage;
