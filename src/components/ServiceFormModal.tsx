import { useEffect } from "react";
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
import { Service } from "@/types/booking";

const serviceFormSchema = z.object({
  title: z.string().min(1, "サービス名を入力してください").max(100),
  description: z.string().min(1, "説明を入力してください").max(500),
  basePrice: z.coerce.number().min(0, "価格は0以上である必要があります"),
  duration: z.coerce.number().min(15, "所要時間は15分以上である必要があります"),
  imageUrl: z.string().url("有効なURLを入力してください"),
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
    } else {
      form.reset({
        title: "",
        description: "",
        basePrice: 0,
        duration: 60,
        imageUrl: "",
        category: "cleaning",
      });
    }
  }, [service, form]);

  const handleSubmit = (values: ServiceFormValues) => {
    onSubmit(values);
    form.reset();
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>画像URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/image.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    サービスのイメージ画像のURLを入力してください
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
              <Button type="submit" className="btn-primary">
                {service ? "更新" : "追加"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
