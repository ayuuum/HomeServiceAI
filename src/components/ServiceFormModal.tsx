import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { Service } from "@/types/booking";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { QuantityDiscount } from "@/lib/discountCalculator";

const serviceFormSchema = z.object({
  title: z.string().min(1, "サービス名を入力してください").max(100),
  description: z.string().min(1, "説明を入力してください").max(500),
  basePrice: z.coerce.number().min(0, "価格は0以上である必要があります"),
  duration: z.coerce.number().min(15, "所要時間は15分以上である必要があります"),
  imageUrl: z.string().optional(),
  category: z.string().min(1, "カテゴリーを選択してください"),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface ServiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSubmit: (values: ServiceFormValues & { quantityDiscounts: QuantityDiscount[] }) => void;
}

export const ServiceFormModal = ({
  open,
  onOpenChange,
  service,
  onSubmit,
}: ServiceFormModalProps) => {
  const { organizationId } = useAuth();
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [discountTiers, setDiscountTiers] = useState<QuantityDiscount[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      title: "",
      description: "",
      basePrice: 0,
      duration: 60,
      imageUrl: "",
      category: "cleaning",
    },
  });

  useEffect(() => {
    if (service) {
      form.reset({
        title: service.title,
        description: service.description,
        basePrice: service.basePrice,
        duration: service.duration,
        imageUrl: service.imageUrl,
        category: service.category,
      });
      setPreviewUrl(service.imageUrl);
      setDiscountTiers(service.quantityDiscounts || []);
    } else {
      form.reset({
        title: "",
        description: "",
        basePrice: 0,
        duration: 60,
        imageUrl: "",
        category: "cleaning",
      });
      setPreviewUrl("");
      setDiscountTiers([]);
    }
  }, [service, form, open]);

  // Discount tier management functions
  const addDiscountTier = () => {
    const lastTier = discountTiers[discountTiers.length - 1];
    const newMinQuantity = lastTier ? lastTier.min_quantity + 1 : 2;
    const newDiscountRate = lastTier ? Math.min(lastTier.discount_rate + 0.05, 0.5) : 0.1;
    setDiscountTiers([...discountTiers, { min_quantity: newMinQuantity, discount_rate: newDiscountRate }]);
  };

  const removeDiscountTier = (index: number) => {
    setDiscountTiers(discountTiers.filter((_, i) => i !== index));
  };

  const updateDiscountTier = (index: number, field: keyof QuantityDiscount, value: number) => {
    const updated = [...discountTiers];
    updated[index] = { ...updated[index], [field]: value };
    // Sort by min_quantity after update
    updated.sort((a, b) => a.min_quantity - b.min_quantity);
    setDiscountTiers(updated);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      throw new Error('サポートされていないファイル形式です。JPG、PNG、GIF、WebPのみ対応しています。');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('ファイルサイズは5MB以下にしてください。');
    }

    if (!organizationId) {
      throw new Error('組織情報が見つかりません。再度ログインしてください。');
    }

    // Use organization-scoped path for storage policy compliance
    const fileName = `${organizationId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error } = await supabase.storage
      .from('service-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from('service-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;

    // 選択直後にローカルプレビューを表示
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(localPreviewUrl);

    setIsUploading(true);
    try {
      const url = await uploadImage(file);
      // アップロード成功後、URLを本番のものに置き換え
      URL.revokeObjectURL(localPreviewUrl);
      setPreviewUrl(url);
      form.setValue('imageUrl', url);
      toast.success('画像をアップロードしました');
    } catch (error) {
      console.error('Upload error:', error);
      // アップロード失敗時はプレビューをクリア
      URL.revokeObjectURL(localPreviewUrl);
      setPreviewUrl("");
      toast.error(error instanceof Error ? error.message : '画像のアップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeImage = () => {
    setPreviewUrl("");
    form.setValue('imageUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (values: ServiceFormValues) => {
    // 画像は任意なのでチェックを削除
    onSubmit({ ...values, quantityDiscounts: discountTiers });
    form.reset();
    setPreviewUrl("");
    setDiscountTiers([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {service ? "サービスを編集" : "新規サービスを追加"}
          </DialogTitle>
          <DialogDescription>
            サービスの詳細情報を入力してください
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>サービス名</FormLabel>
                  <FormControl>
                    <Input placeholder="エアコンクリーニング" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="プロの技術でエアコンを徹底洗浄..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>基本料金（円）</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="12000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>所要時間（分）</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="90" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>カテゴリー</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="カテゴリーを選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cleaning">クリーニング</SelectItem>
                      <SelectItem value="repair">修理</SelectItem>
                      <SelectItem value="maintenance">メンテナンス</SelectItem>
                      <SelectItem value="other">その他</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity Discount Tiers */}
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Icon name="sell" size={16} className="text-amber-600" />
                複数台割引設定
              </FormLabel>
              <FormDescription>
                複数台の注文時に適用される割引を設定できます
              </FormDescription>
              
              <div className="space-y-2 mt-2">
                {discountTiers.map((tier, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={2}
                        value={tier.min_quantity}
                        onChange={(e) => updateDiscountTier(index, 'min_quantity', parseInt(e.target.value) || 2)}
                        className="w-16 text-center"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">台以上で</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={Math.round(tier.discount_rate * 100)}
                        onChange={(e) => updateDiscountTier(index, 'discount_rate', (parseInt(e.target.value) || 0) / 100)}
                        className="w-16 text-center"
                      />
                      <span className="text-sm text-muted-foreground">%OFF</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDiscountTier(index)}
                      className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Icon name="delete" size={16} />
                    </Button>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDiscountTier}
                  className="w-full"
                >
                  <Icon name="add" size={16} className="mr-1" />
                  割引ティアを追加
                </Button>
              </div>
            </FormItem>

            <FormField
              control={form.control}
              name="imageUrl"
              render={() => (
                <FormItem>
                  <FormLabel>サービス画像</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {previewUrl ? (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
                          <img
                            src={previewUrl}
                            alt="プレビュー"
                            className={`w-full h-full object-cover ${isUploading ? 'opacity-50' : ''}`}
                          />
                          {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Icon name="progress_activity" size={32} className="text-white animate-spin" />
                              <span className="ml-2 text-white text-sm font-medium">アップロード中...</span>
                            </div>
                          )}
                          {!isUploading && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={removeImage}
                            >
                              <Icon name="close" size={16} />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          className={`
                            flex flex-col items-center justify-center w-full h-40
                            border-2 border-dashed rounded-lg cursor-pointer
                            transition-colors duration-200
                            ${isDragging 
                              ? 'border-primary bg-primary/10' 
                              : 'border-muted-foreground/30 hover:border-primary hover:bg-muted/50'
                            }
                            ${isUploading ? 'pointer-events-none opacity-50' : ''}
                          `}
                        >
                          {isUploading ? (
                            <>
                              <Icon name="progress_activity" size={40} className="text-muted-foreground animate-spin" />
                              <span className="mt-2 text-sm text-muted-foreground">アップロード中...</span>
                            </>
                          ) : (
                            <>
                              <Icon name="cloud_upload" size={40} className="text-muted-foreground" />
                              <span className="mt-2 text-sm text-muted-foreground">
                                クリックまたはドラッグ&ドロップで画像をアップロード
                              </span>
                              <span className="mt-1 text-xs text-muted-foreground">
                                JPG, PNG, GIF, WebP (最大5MB)
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleInputChange}
                        className="hidden"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    サービスのイメージ画像をアップロードしてください（任意）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" className="btn-primary" disabled={isUploading}>
                {service ? "更新" : "追加"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};