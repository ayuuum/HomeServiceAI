import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wind, ChefHat, Bath, Shield, Clock, Sparkles } from "lucide-react";
import Footer from "@/components/Footer";

const LandingPage = () => {
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
            <span className="font-bold text-xl text-foreground">ハウクリPro</span>
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
            プロの技術で、<br className="md:hidden" />
            暮らしをもっと快適に
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            エアコン、キッチン、浴室のクリーニングを
            <br className="hidden md:block" />
            簡単オンライン予約
          </p>
          <Link to="/booking/default">
            <Button 
              size="lg" 
              className="bg-card text-primary hover:bg-card/90 font-semibold px-8 py-6 text-lg"
            >
              今すぐ予約する
            </Button>
          </Link>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            サービス一覧
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <ServiceCard
              icon={<Wind className="h-10 w-10" />}
              title="エアコンクリーニング"
              description="分解洗浄で内部のカビ・ホコリを徹底除去。清潔な空気で快適な生活を。"
              imageUrl="/images/services/service-aircon.jpg"
            />
            <ServiceCard
              icon={<ChefHat className="h-10 w-10" />}
              title="キッチンクリーニング"
              description="頑固な油汚れ・焦げ付きをプロの技術でピカピカに。衛生的なキッチンへ。"
              imageUrl="/images/services/service-kitchen.jpg"
            />
            <ServiceCard
              icon={<Bath className="h-10 w-10" />}
              title="浴室クリーニング"
              description="水垢・カビ・石鹸カスを徹底除去。清潔で気持ちの良いバスタイムを。"
              imageUrl="/images/services/service-bathroom.jpg"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            選ばれる理由
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <FeatureCard
              icon={<Sparkles className="h-8 w-8 text-primary" />}
              title="プロの技術"
              description="経験豊富なスタッフが、専門機材を使って徹底クリーニング"
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-primary" />}
              title="安心価格"
              description="明確な料金体系で、追加料金の心配なし"
            />
            <FeatureCard
              icon={<Clock className="h-8 w-8 text-primary" />}
              title="簡単予約"
              description="24時間オンライン予約。最短翌日対応可能"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            今すぐ予約しませんか？
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            オンラインで簡単予約。お見積もりも即座に確認できます。
          </p>
          <Link to="/booking/default">
            <Button size="lg" className="font-semibold px-8 py-6 text-lg">
              予約ページへ
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
};

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  imageUrl: string;
}

const ServiceCard = ({ icon, title, description, imageUrl }: ServiceCardProps) => (
  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
    <div 
      className="h-40 bg-cover bg-center"
      style={{ backgroundImage: `url(${imageUrl})` }}
    />
    <CardContent className="p-6">
      <div className="text-primary mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="text-center">
    <div className="flex justify-center mb-4">{icon}</div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default LandingPage;
