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
  onSubmit: (values: ServiceFormValues) => void;
}

export const ServiceFormModal = ({
  open,
  onOpenChange,
  service,
  onSubmit,
}: ServiceFormModalProps) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
    }
  }, [service, form, open]);

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      throw new Error('サポートされていないファイル形式です。JPG、PNG、GIF、WebPのみ対応しています。');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('ファイルサイズは5MB以下にしてください。');
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

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

    setIsUploading(true);
    try {
      const url = await uploadImage(file);
      setPreviewUrl(url);
      form.setValue('imageUrl', url);
      toast.success('画像をアップロードしました');
    } catch (error) {
      console.error('Upload error:', error);
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
    if (!values.imageUrl) {
      toast.error('サービス画像をアップロードしてください');
      return;
    }
    onSubmit(values);
    form.reset();
    setPreviewUrl("");
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
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={removeImage}
                          >
                            <Icon name="close" size={16} />
                          </Button>
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
                    サービスのイメージ画像をアップロードしてください
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
