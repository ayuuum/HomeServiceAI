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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map((store) => (
              <Card key={store.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {store.name}
                      </CardTitle>
                      {store.is_hq && (
                        <Badge variant="secondary" className="mt-2">
                          本部
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedStore(store);
                          setIsModalOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setStoreToDelete(store);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="space-y-1">
                    {store.line_channel_token && (
                      <p className="text-xs">LINE連携: 設定済み</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      作成日: {new Date(store.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </CardDescription>
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
