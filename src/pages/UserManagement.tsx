import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Icon } from '@/components/ui/icon';
import { AdminHeader } from '@/components/AdminHeader';
import { MobileNav } from '@/components/MobileNav';
import { UserEditModal } from '@/components/UserEditModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UserWithRoles {
  id: string;
  email: string | null;
  name: string | null;
  store_id: string | null;
  store_name: string | null;
  roles: string[];
  created_at: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

const roleLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  hq_admin: { label: '本部管理者', variant: 'default' },
  store_owner: { label: '店舗オーナー', variant: 'secondary' },
  store_staff: { label: 'スタッフ', variant: 'outline' },
  admin: { label: '管理者', variant: 'default' },
  moderator: { label: 'モデレーター', variant: 'secondary' },
  user: { label: 'ユーザー', variant: 'outline' },
};

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load profiles with store info
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          name,
          store_id,
          created_at,
          stores:store_id (name)
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Load all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Load stores for dropdown
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name')
        .order('name');

      if (storesError) throw storesError;

      // Merge profiles with roles
      const usersWithRoles: UserWithRoles[] = (profilesData || []).map((profile: any) => ({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        store_id: profile.store_id,
        store_name: profile.stores?.name || null,
        roles: (rolesData || [])
          .filter((r: any) => r.user_id === profile.id)
          .map((r: any) => r.role),
        created_at: profile.created_at,
      }));

      setUsers(usersWithRoles);
      setStores(storesData || []);
    } catch (error) {
      console.error('ユーザー読み込みエラー:', error);
      toast({
        variant: "destructive",
        title: "読み込み失敗",
        description: "ユーザー情報の読み込みに失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(query) ||
      user.store_name?.toLowerCase().includes(query)
    );
  });

  const handleEditUser = (user: UserWithRoles) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <AdminHeader />
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">ユーザー管理</h1>
            <p className="text-muted-foreground mt-2">ユーザーの店舗・ロール割り当て</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Icon name="search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="メール、名前、店舗名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Icon name="group" size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? '検索結果がありません' : 'ユーザーが登録されていません'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ユーザー</TableHead>
                    <TableHead>店舗</TableHead>
                    <TableHead>ロール</TableHead>
                    <TableHead>登録日</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <motion.tr key={user.id} variants={item} className="group">
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name || '名前未設定'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.store_name ? (
                          <Badge variant="outline">{user.store_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">未割り当て</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge
                                key={role}
                                variant={roleLabels[role]?.variant || 'outline'}
                                className="text-xs"
                              >
                                {roleLabels[role]?.label || role}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">ロールなし</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {new Date(user.created_at).toLocaleDateString('ja-JP')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEditUser(user)}
                        >
                          <Icon name="edit" size={16} />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          全 {filteredUsers.length} ユーザー
        </div>
      </div>

      <UserEditModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        user={selectedUser}
        stores={stores}
        onSuccess={loadData}
      />

      <MobileNav />
    </div>
  );
}
