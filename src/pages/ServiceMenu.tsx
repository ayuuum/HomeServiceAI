import { ServiceCard } from "@/components/ServiceCard";
import { mockServices } from "@/data/mockData";
import { Sparkles } from "lucide-react";

const ServiceMenu = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">ServiceBook</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-transparent py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-center">
            プロのサービスを<br className="md:hidden" />簡単予約
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto">
            メニューを選んで、日時を選ぶだけ。<br />
            見積もり不要、すぐに予約完了できます。
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="container max-w-6xl mx-auto px-4 py-8">
        <h3 className="text-xl font-semibold mb-6">サービス一覧</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default ServiceMenu;
