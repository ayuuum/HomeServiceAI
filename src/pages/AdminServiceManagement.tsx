import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Clock, DollarSign } from "lucide-react";
import { ServiceFormModal } from "@/components/ServiceFormModal";
import { Service } from "@/types/booking";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mapDbServiceToService, mapServiceToDbService } from "@/lib/serviceMapper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminServiceManagement = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();

    // Set up realtime subscription
    const channel = supabase
      .channel('admin-services-changes')
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

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching services:', error);
      toast.error('サービスの読み込みに失敗しました');
    } else {
      setServices((data || []).map(mapDbServiceToService));
    }
    setLoading(false);
  };

  const handleAddService = () => {
    setSelectedService(null);
    setModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setModalOpen(true);
  };

  const handleDeleteClick = (serviceId: string) => {
    setServiceToDelete(serviceId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (serviceToDelete) {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceToDelete);

      if (error) {
        console.error('Error deleting service:', error);
        toast.error("サービスの削除に失敗しました");
      } else {
        toast.success("サービスを削除しました");
      }
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  const handleSubmit = async (values: any) => {
    const dbValues = mapServiceToDbService(values);
    
    if (selectedService) {
      // Edit existing service
      const { error } = await supabase
        .from('services')
        .update(dbValues)
        .eq('id', selectedService.id);

      if (error) {
        console.error('Error updating service:', error);
        toast.error("サービスの更新に失敗しました");
      } else {
        toast.success("サービスを更新しました");
      }
    } else {
      // Add new service
      const { error } = await supabase
        .from('services')
        .insert([dbValues]);

      if (error) {
        console.error('Error adding service:', error);
        toast.error("サービスの追加に失敗しました");
      } else {
        toast.success("新しいサービスを追加しました");
      }
    }
  };

  const getCategoryBadge = (category: string) => {
    const categoryMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      cleaning: { label: "クリーニング", variant: "default" },
      repair: { label: "修理", variant: "secondary" },
      maintenance: { label: "メンテナンス", variant: "outline" },
      other: { label: "その他", variant: "outline" },
    };
    const config = categoryMap[category] || categoryMap.other;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">サービス管理</h2>
          <p className="text-sm text-muted-foreground mt-1">
            提供するサービスの追加・編集・削除ができます
          </p>
        </div>
        <Button onClick={handleAddService} className="btn-primary gap-2">
          <Plus className="h-4 w-4" />
          新規サービス追加
        </Button>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="text-center py-12">読み込み中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
          <Card key={service.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-video relative overflow-hidden bg-muted">
              <img
                src={service.imageUrl}
                alt={service.title}
                className="w-full h-full object-cover"
              />
            </div>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{service.title}</CardTitle>
                {getCategoryBadge(service.category)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {service.description}
              </p>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{service.duration}分</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-primary">
                  <DollarSign className="h-4 w-4" />
                  <span>¥{service.basePrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEditService(service)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  編集
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleDeleteClick(service.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {services.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              まだサービスが登録されていません
            </p>
            <Button onClick={handleAddService} className="btn-primary gap-2">
              <Plus className="h-4 w-4" />
              最初のサービスを追加
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Service Form Modal */}
      <ServiceFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        service={selectedService}
        onSubmit={handleSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>サービスを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。サービスに関連する予約データも削除される可能性があります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminServiceManagement;
