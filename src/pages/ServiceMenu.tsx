import { ServiceCard } from "@/components/ServiceCard";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Service } from "@/types/booking";
import { mapDbServiceToService } from "@/lib/serviceMapper";

const ServiceMenu = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching services:', error);
      } else {
        setServices((data || []).map(mapDbServiceToService));
      }
      setLoading(false);
    };

    fetchServices();

    // Set up realtime subscription
    const channel = supabase
      .channel('services-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setServices(prev => [...prev, mapDbServiceToService(payload.new)]);
          } else if (payload.eventType === 'UPDATE') {
            setServices(prev => prev.map(s => 
              s.id === payload.new.id ? mapDbServiceToService(payload.new) : s
            ));
          } else if (payload.eventType === 'DELETE') {
            setServices(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
        {loading ? (
          <div className="text-center py-12">読み込み中...</div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            サービスがまだ登録されていません
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ServiceMenu;
