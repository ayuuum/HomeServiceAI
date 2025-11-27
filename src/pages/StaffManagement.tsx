import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { StaffFormModal } from "@/components/StaffFormModal";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UserCog } from "lucide-react";
import type { Staff } from "@/types/booking";

export default function StaffManagement() {
  const { selectedStoreId } = useStore();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);

  const { data: staffs = [], isLoading } = useQuery({
    queryKey: ["staffs", selectedStoreId],
    queryFn: async () => {
      const query = supabase
        .from("staffs")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedStoreId) {
        query.eq("store_id", selectedStoreId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((s) => ({
        id: s.id,
        storeId: s.store_id,
        name: s.name,
        colorCode: s.color_code || "#3b82f6",
        lineUserId: s.line_user_id || undefined,
        isActive: s.is_active ?? true,
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staffs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staffs"] });
      toast.success("スタッフを削除しました");
      setDeletingStaff(null);
    },
    onError: (error) => {
      toast.error("削除に失敗しました: " + error.message);
    },
  });

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingStaff(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingStaff(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">スタッフ管理</h1>
          <p className="text-muted-foreground">
            スタッフの情報とテーマカラーを管理できます
          </p>
        </div>

        <div className="mb-6">
          <Button onClick={handleAdd} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            新規スタッフ登録
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            読み込み中...
          </div>
        ) : staffs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            スタッフデータがありません
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staffs.map((staff) => (
              <div
                key={staff.id}
                className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: staff.colorCode || "#3b82f6" }}
                  >
                    <UserCog className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-foreground mb-1 truncate">
                      {staff.name}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">カラー:</span>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border border-border"
                            style={{ backgroundColor: staff.colorCode || "#3b82f6" }}
                          />
                          <span className="text-foreground font-mono">
                            {staff.colorCode || "#3b82f6"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">LINE:</span>
                        <span className="text-foreground truncate">
                          {staff.lineUserId || "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">ステータス:</span>
                        <Badge variant={staff.isActive ? "default" : "secondary"}>
                          {staff.isActive ? "有効" : "無効"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(staff)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    編集
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setDeletingStaff(staff)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StaffFormModal
        open={isFormOpen}
        onClose={handleCloseForm}
        staff={editingStaff}
      />

      <AlertDialog
        open={!!deletingStaff}
        onOpenChange={() => setDeletingStaff(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>スタッフを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingStaff?.name} を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingStaff && deleteMutation.mutate(deletingStaff.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
