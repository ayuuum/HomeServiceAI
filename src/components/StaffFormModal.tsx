import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { Staff } from "@/types/booking";

const staffSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  colorCode: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "有効なカラーコードを入力してください（例: #3b82f6）"),
  lineUserId: z.string().max(100).optional(),
  isActive: z.boolean(),
});

type StaffFormData = z.infer<typeof staffSchema>;

interface StaffFormModalProps {
  open: boolean;
  onClose: () => void;
  staff?: Staff | null;
}

const presetColors = [
  { name: "青", color: "#3b82f6" },
  { name: "赤", color: "#ef4444" },
  { name: "緑", color: "#10b981" },
  { name: "黄", color: "#f59e0b" },
  { name: "紫", color: "#8b5cf6" },
  { name: "オレンジ", color: "#f97316" },
  { name: "ピンク", color: "#ec4899" },
  { name: "シアン", color: "#06b6d4" },
];

export function StaffFormModal({ open, onClose, staff }: StaffFormModalProps) {
  const { selectedStoreId } = useStore();
  const queryClient = useQueryClient();

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      colorCode: "#3b82f6",
      lineUserId: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (staff) {
      form.reset({
        name: staff.name,
        colorCode: staff.colorCode || "#3b82f6",
        lineUserId: staff.lineUserId || "",
        isActive: staff.isActive ?? true,
      });
    } else {
      form.reset({
        name: "",
        colorCode: "#3b82f6",
        lineUserId: "",
        isActive: true,
      });
    }
  }, [staff, form]);

  const mutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      if (!selectedStoreId) {
        throw new Error("店舗が選択されていません");
      }

      const payload = {
        store_id: selectedStoreId,
        name: data.name,
        color_code: data.colorCode,
        line_user_id: data.lineUserId || null,
        is_active: data.isActive,
      };

      if (staff) {
        const { error } = await supabase
          .from("staffs")
          .update(payload)
          .eq("id", staff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("staffs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffs"] });
      toast.success(staff ? "スタッフ情報を更新しました" : "スタッフを登録しました");
      onClose();
    },
    onError: (error) => {
      toast.error("保存に失敗しました: " + error.message);
    },
  });

  const onSubmit = (data: StaffFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {staff ? "スタッフ情報を編集" : "新規スタッフ登録"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名前 *</FormLabel>
                  <FormControl>
                    <Input placeholder="佐藤太郎" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="colorCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>テーマカラー *</FormLabel>
                  <FormDescription>
                    ガントチャートで使用される色です
                  </FormDescription>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {presetColors.map((preset) => (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => field.onChange(preset.color)}
                          className="w-10 h-10 rounded-md border-2 transition-all hover:scale-110"
                          style={{
                            backgroundColor: preset.color,
                            borderColor:
                              field.value === preset.color
                                ? "hsl(var(--foreground))"
                                : "hsl(var(--border))",
                          }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="color"
                        value={field.value}
                        onChange={field.onChange}
                        className="w-16 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        placeholder="#3b82f6"
                        value={field.value}
                        onChange={field.onChange}
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lineUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LINE User ID</FormLabel>
                  <FormControl>
                    <Input placeholder="U1234567890abcdef..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">アクティブ状態</FormLabel>
                    <FormDescription>
                      無効にするとスケジュールに表示されません
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
