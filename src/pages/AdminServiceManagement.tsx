import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { ServiceFormModal } from "@/components/ServiceFormModal";
import { ServiceOptionsModal } from "@/components/ServiceOptionsModal";
import { Service } from "@/types/booking";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mapDbServiceToService, mapServiceToDbService } from "@/lib/serviceMapper";
import { useAuth } from "@/contexts/AuthContext";
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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } }
};

const AdminServiceManagement = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const { organizationId } = useAuth();

  const fetchServices = async () => {
    if (!organizationId) return;
    
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching services:', error);
      toast.error('サービスの読み込みに失敗しました');
    } else {
      setServices((data || []).map(mapDbServiceToService));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!organizationId) return;
    
    fetchServices();

    // Set up realtime subscription filtered by organization
    const channel = supabase
      .channel(`admin-services-changes-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services',
          filter: `organization_id=eq.${organizationId}`
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
  }, [organizationId]);

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

  const handleManageOptions = (service: Service) => {
    setSelectedService(service);
    setOptionsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (serviceToDelete && organizationId) {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceToDelete)
        .eq('organization_id', organizationId);

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
    if (!organizationId) {
      toast.error("組織IDが見つかりません");
      return;
    }
    
    const dbValues = mapServiceToDbService(values);

    if (selectedService) {
      // Edit existing service
      const { error } = await supabase
        .from('services')
        .update(dbValues)
        .eq('id', selectedService.id)
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Error updating service:', error);
        toast.error("サービスの更新に失敗しました");
      } else {
        toast.success("サービスを更新しました");
      }
    } else {
      // Add new service
      const newService = {
        ...dbValues,
        organization_id: organizationId
      };

      const { error } = await supabase
        .from('services')
        .insert([newService]);

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
          <Icon name="add" size={16} />
          新規サービス追加
        </Button>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="text-center py-12">読み込み中...</div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {services.map((service) => (
            <motion.div key={service.id} variants={item} whileHover={{ y: -5 }}>
              <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 rounded-[10px] shadow-medium border-none group">
                <div className="h-48 relative overflow-hidden bg-muted">
                  <img
                    src={service.imageUrl}
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 right-3">
                    {getCategoryBadge(service.category)}
                  </div>
                </div>
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-xl font-bold line-clamp-1">{service.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {service.description}
                  </p>

                  <div className="flex items-end justify-between">
                    <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                      <Icon name="schedule" size={16} />
                      <span className="text-sm font-medium">{service.duration}分</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-0.5">基本料金</p>
                      <div className="flex items-center gap-0.5 font-bold text-primary leading-none">
                        <span className="text-lg">¥</span>
                        <span className="text-2xl tabular-nums">{service.basePrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="col-span-2 h-9 border-primary/20 hover:bg-primary/5 hover:text-primary"
                      onClick={() => handleEditService(service)}
                    >
                      <Icon name="edit" size={16} className="mr-1.5" />
                      編集
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="col-span-1 h-9 px-0"
                      onClick={() => handleManageOptions(service)}
                      title="オプション管理"
                    >
                      <Icon name="playlist_add" size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="col-span-1 h-9 px-0 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleDeleteClick(service.id)}
                      title="削除"
                    >
                      <Icon name="delete" size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {services.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              まだサービスが登録されていません
            </p>
            <Button onClick={handleAddService} className="btn-primary gap-2">
              <Icon name="add" size={16} />
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

      <ServiceOptionsModal
        open={optionsModalOpen}
        onOpenChange={setOptionsModalOpen}
        service={selectedService}
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
