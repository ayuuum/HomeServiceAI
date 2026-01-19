import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { supabase } from "@/integrations/supabase/client";
import { ServiceOption } from "@/types/booking";
import { mapDbOptionToOption } from "@/lib/serviceMapper";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ServiceOptionsManagerProps {
  serviceId: string;
}

export const ServiceOptionsManager = ({ serviceId }: ServiceOptionsManagerProps) => {
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    price: 0,
    description: "",
  });
  const { organizationId } = useAuth();

  const fetchOptions = async () => {
    if (!organizationId) return;
    
    const { data } = await supabase
      .from('service_options')
      .select('*')
      .eq('service_id', serviceId)
      .eq('organization_id', organizationId);

    if (data) {
      setOptions(data.map(mapDbOptionToOption));
    }
  };

  useEffect(() => {
    if (!organizationId) return;
    
    fetchOptions();

    const channel = supabase
      .channel(`options-${serviceId}-${organizationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'service_options',
        filter: `service_id=eq.${serviceId}`
      }, fetchOptions)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceId, organizationId]);

  const handleSubmit = async () => {
    if (!formData.title || formData.price <= 0) {
      toast.error("タイトルと価格を入力してください");
      return;
    }

    if (!organizationId) {
      toast.error("組織IDが見つかりません");
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from('service_options')
        .update({
          title: formData.title,
          price: formData.price,
          description: formData.description
        })
        .eq('id', editingId)
        .eq('organization_id', organizationId);

      if (!error) {
        toast.success("オプションを更新しました");
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('service_options')
        .insert({
          service_id: serviceId,
          organization_id: organizationId,
          title: formData.title,
          price: formData.price,
          description: formData.description
        });

      if (!error) {
        toast.success("オプションを追加しました");
        resetForm();
      }
    }
  };

  const handleEdit = (option: ServiceOption) => {
    setFormData({
      title: option.title,
      price: option.price,
      description: option.description || "",
    });
    setEditingId(option.id);
    setIsAdding(true);
  };

  const handleDelete = async (optionId: string) => {
    if (!organizationId) return;
    
    const { error } = await supabase
      .from('service_options')
      .delete()
      .eq('id', optionId)
      .eq('organization_id', organizationId);

    if (!error) {
      toast.success("オプションを削除しました");
    }
  };

  const resetForm = () => {
    setFormData({ title: "", price: 0, description: "" });
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">サービスオプション</h3>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Icon name="add" size={16} className="mr-1" />
            オプション追加
          </Button>
        )}
      </div>

      {isAdding && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">
                {editingId ? "オプションを編集" : "新規オプション"}
              </h4>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <Icon name="close" size={16} />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="title">オプション名</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例：お掃除機能付きエアコン"
                />
              </div>

              <div>
                <Label htmlFor="price">追加料金（円）</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  placeholder="3000"
                />
              </div>

              <div>
                <Label htmlFor="description">説明（任意）</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="オプションの詳細説明"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="btn-primary">
                {editingId ? "更新" : "追加"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {options.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            オプションがまだ登録されていません
          </p>
        ) : (
          options.map((option) => (
            <Card key={option.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{option.title}</h4>
                    {option.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-primary mt-2">
                      +¥{option.price.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(option)}
                    >
                      <Icon name="edit" size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(option.id)}
                    >
                      <Icon name="delete" size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
