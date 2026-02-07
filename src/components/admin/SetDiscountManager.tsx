import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Plus, Trash2, Pencil, X, Save, Percent } from "lucide-react";
import { SetDiscountDefinition } from "@/lib/discountCalculator";

interface ServiceItem {
  id: string;
  title: string;
}

export function SetDiscountManager() {
  const { organization, refreshOrganization } = useAuth();
  const { toast } = useToast();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [discounts, setDiscounts] = useState<SetDiscountDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRate, setFormRate] = useState("");
  const [formServiceIds, setFormServiceIds] = useState<string[]>([]);

  useEffect(() => {
    if (organization?.id) {
      loadData();
    }
  }, [organization?.id]);

  const loadData = async () => {
    if (!organization?.id) return;

    // Load services and discounts in parallel
    const [servicesRes, orgRes] = await Promise.all([
      supabase
        .from("services")
        .select("id, title")
        .eq("organization_id", organization.id)
        .order("created_at"),
      supabase
        .from("organizations")
        .select("service_set_discounts")
        .eq("id", organization.id)
        .single(),
    ]);

    if (servicesRes.data) setServices(servicesRes.data);
    if (orgRes.data?.service_set_discounts) {
      setDiscounts(orgRes.data.service_set_discounts as unknown as SetDiscountDefinition[]);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormTitle("");
    setFormDescription("");
    setFormRate("");
    setFormServiceIds([]);
  };

  const handleEdit = (discount: SetDiscountDefinition) => {
    setIsEditing(true);
    setEditingId(discount.id);
    setFormTitle(discount.title);
    setFormDescription(discount.description || "");
    setFormRate(String(Math.round(discount.discount_rate * 100)));
    setFormServiceIds([...discount.service_ids]);
  };

  const handleSave = async () => {
    if (!organization?.id) return;

    if (!formTitle.trim()) {
      toast({ variant: "destructive", title: "セット名を入力してください" });
      return;
    }
    if (formServiceIds.length < 2) {
      toast({ variant: "destructive", title: "2つ以上のサービスを選択してください" });
      return;
    }
    const rateNum = Number(formRate);
    if (!rateNum || rateNum <= 0 || rateNum > 100) {
      toast({ variant: "destructive", title: "割引率は1〜100の間で入力してください" });
      return;
    }

    setIsLoading(true);
    try {
      let updated: SetDiscountDefinition[];

      if (editingId) {
        // Update existing
        updated = discounts.map((d) =>
          d.id === editingId
            ? {
                ...d,
                title: formTitle.trim(),
                description: formDescription.trim() || undefined,
                discount_rate: rateNum / 100,
                service_ids: formServiceIds,
              }
            : d
        );
      } else {
        // Add new
        const newDiscount: SetDiscountDefinition = {
          id: crypto.randomUUID(),
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          discount_rate: rateNum / 100,
          service_ids: formServiceIds,
        };
        updated = [...discounts, newDiscount];
      }

      const { error } = await supabase
        .from("organizations")
        .update({ service_set_discounts: updated as any })
        .eq("id", organization.id);

      if (error) throw error;

      setDiscounts(updated);
      resetForm();
      await refreshOrganization();
      toast({ title: "保存しました" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "保存に失敗しました",
        description: error instanceof Error ? error.message : "エラーが発生しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!organization?.id) return;

    setIsLoading(true);
    try {
      const updated = discounts.filter((d) => d.id !== id);
      const { error } = await supabase
        .from("organizations")
        .update({ service_set_discounts: updated as any })
        .eq("id", organization.id);

      if (error) throw error;

      setDiscounts(updated);
      await refreshOrganization();
      toast({ title: "削除しました" });
    } catch (error) {
      toast({ variant: "destructive", title: "削除に失敗しました" });
    } finally {
      setIsLoading(false);
    }
  };

  const getServiceTitle = (serviceId: string) => {
    return services.find((s) => s.id === serviceId)?.title || "不明なサービス";
  };

  const toggleServiceId = (serviceId: string) => {
    setFormServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon name="loyalty" size={20} />
          セット割引の管理
        </CardTitle>
        <CardDescription>
          複数サービスの同時予約で自動適用される割引を設定します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing discounts list */}
        {discounts.length > 0 && (
          <div className="space-y-2">
            {discounts.map((discount) => (
              <div
                key={discount.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{discount.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(discount.discount_rate * 100)}% OFF
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {discount.service_ids.map((id) => getServiceTitle(id)).join(" + ")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(discount)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(discount.id)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit form */}
        {isEditing ? (
          <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                {editingId ? "セット割を編集" : "新しいセット割を追加"}
              </h4>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">セット名</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="例: 水回りセット割"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">説明（任意）</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="例: エアコンと浴室の同時予約で割引"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">割引率（%）</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={formRate}
                  onChange={(e) => setFormRate(e.target.value)}
                  placeholder="10"
                  className="h-9 pr-8"
                />
                <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">対象サービス（2つ以上選択）</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={formServiceIds.includes(service.id)}
                      onCheckedChange={() => toggleServiceId(service.id)}
                    />
                    <span className="text-sm truncate">{service.title}</span>
                  </label>
                ))}
              </div>
              {services.length === 0 && (
                <p className="text-xs text-muted-foreground">サービスが登録されていません</p>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={isLoading}
              size="sm"
              className="w-full"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {editingId ? "更新" : "追加"}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="w-full"
            disabled={services.length < 2}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            新しいセット割を追加
          </Button>
        )}

        {services.length < 2 && (
          <p className="text-xs text-muted-foreground text-center">
            セット割を設定するには2つ以上のサービスを登録してください
          </p>
        )}
      </CardContent>
    </Card>
  );
}
