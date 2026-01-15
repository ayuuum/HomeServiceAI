import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Customer } from "@/types/booking";

const customerSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  phone: z.string().max(20).optional(),
  email: z.string().email("有効なメールアドレスを入力してください").max(255).optional().or(z.literal("")),
  postalCode: z.string().max(10).optional(),
  address: z.string().max(500).optional(),
  lineUserId: z.string().max(100).optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
}

export function CustomerFormModal({
  open,
  onClose,
  customer,
}: CustomerFormModalProps) {
  const queryClient = useQueryClient();

  const { organizationId } = useAuth();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      postalCode: "",
      address: "",
      lineUserId: "",
    },
  });

  useEffect(() => {
    if (customer) {
      form.reset({
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        postalCode: customer.postalCode || "",
        address: customer.address || "",
        lineUserId: customer.lineUserId || "",
      });
    } else {
      form.reset({
        name: "",
        phone: "",
        email: "",
        postalCode: "",
        address: "",
        lineUserId: "",
      });
    }
  }, [customer, form]);

  const mutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      // Base payload for both update and insert
      const payload: any = {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        postal_code: data.postalCode || null,
        address: data.address || null,
        line_user_id: data.lineUserId || null,
      };

      if (customer) {
        const { error } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", customer.id);
        if (error) throw error;
      } else {
        if (!organizationId) {
          throw new Error("組織IDが見つかりません");
        }
        // Add organization_id for new records
        payload.organization_id = organizationId;

        const { error } = await supabase.from("customers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success(customer ? "顧客情報を更新しました" : "顧客を登録しました");
      onClose();
    },
    onError: (error) => {
      toast.error("保存に失敗しました: " + error.message);
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {customer ? "顧客情報を編集" : "新規顧客登録"}
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
                    <Input placeholder="山田太郎" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>電話番号</FormLabel>
                  <FormControl>
                    <Input placeholder="090-1234-5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>郵便番号</FormLabel>
                  <FormControl>
                    <Input placeholder="100-0001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>住所</FormLabel>
                  <FormControl>
                    <Input placeholder="東京都渋谷区..." {...field} />
                  </FormControl>
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