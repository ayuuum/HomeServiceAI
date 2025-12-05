import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Building2, Edit, Trash2 } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { MobileNav } from '@/components/MobileNav';
import StoreFormModal from '@/components/StoreFormModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function StoreManagement() {
  const { toast } = useToast();
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<any>(null);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('店舗読み込みエラー:', error);
      toast({
        variant: "destructive",
        title: "読み込み失敗",
        description: "店舗情報の読み込みに失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!storeToDelete) return;

    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeToDelete.id);

      if (error) throw error;

      toast({
        title: "削除完了",
        description: "店舗を削除しました",
      });

      loadStores();
    } catch (error) {
      console.error('削除エラー:', error);
      toast({
        variant: "destructive",
        title: "削除失敗",
        description: error instanceof Error ? error.message : "店舗の削除に失敗しました",
      });
    } finally {
      setDeleteDialogOpen(false);
      setStoreToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <AdminHeader />
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">店舗管理</h1>
            <p className="text-muted-foreground mt-2">店舗情報の管理</p>
          </div>
          <Button onClick={() => {
            setSelectedStore(null);
            setIsModalOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            新規店舗登録
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        ) : stores.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">店舗が登録されていません</p>
              <Button
                onClick={() => {
                  setSelectedStore(null);
                  setIsModalOpen(true);
                }}
                className="mt-4"
              >
                最初の店舗を登録
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <Card key={store.id} className="hover:shadow-medium transition-all duration-300 border-none shadow-subtle overflow-hidden group">
                <div className="h-32 bg-muted relative">
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
                    <Building2 className="h-12 w-12" />
                  </div>
                  {store.is_hq && (
                    <Badge className="absolute top-3 right-3 shadow-sm" variant="default">
                      本部
                    </Badge>
                  )}
                </div>
                <CardHeader className="pb-2 pt-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-bold truncate pr-2">
                        {store.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: <span className="font-mono">{store.id.slice(0, 8)}...</span>
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">LINE連携</span>
                      <Badge variant={store.line_channel_token ? "outline" : "secondary"} className={store.line_channel_token ? "text-success border-success/30 bg-success/5" : "text-muted-foreground"}>
                        {store.line_channel_token ? "設定済み" : "未設定"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">登録日</span>
                      <span className="font-medium tabular-nums">
                        {new Date(store.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6 pt-4 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9"
                      onClick={() => {
                        setSelectedStore(store);
                        setIsModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      編集
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setStoreToDelete(store);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <StoreFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        store={selectedStore}
        onSuccess={loadStores}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>店舗を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。店舗「{storeToDelete?.name}」を削除してもよろしいですか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
    </div>
  );
}
