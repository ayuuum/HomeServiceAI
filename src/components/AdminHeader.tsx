import { Building2, Sparkles, LogOut, Users, UserCog, MessageCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/AuthContext";
import { MobileNav } from "@/components/MobileNav";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";

export function AdminHeader() {
  const { selectedStoreId, setSelectedStoreId, stores, isLoading } = useStore();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MobileNav />
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold hidden sm:block">管理画面</h1>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
            <NavLink
              to="/admin"
              end
              className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted"
              activeClassName="bg-muted text-primary"
            >
              ダッシュボード
            </NavLink>
            <NavLink
              to="/admin/schedule"
              className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted"
              activeClassName="bg-muted text-primary"
            >
              スタッフ配置
            </NavLink>
            <NavLink
              to="/admin/customers"
              className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted flex items-center gap-1"
              activeClassName="bg-muted text-primary"
            >
              <Users className="h-4 w-4" />
              顧客管理
            </NavLink>
            <NavLink
              to="/admin/staffs"
              className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted flex items-center gap-1"
              activeClassName="bg-muted text-primary"
            >
              <UserCog className="h-4 w-4" />
              スタッフ管理
            </NavLink>
            <NavLink
              to="/admin/line-messages"
              className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted flex items-center gap-1"
              activeClassName="bg-muted text-primary"
            >
              <MessageCircle className="h-4 w-4" />
              LINE履歴
            </NavLink>
            <NavLink
              to="/admin/line-chat"
              className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted flex items-center gap-1"
              activeClassName="bg-muted text-primary"
            >
              <MessageCircle className="h-4 w-4" />
              LINEチャット
            </NavLink>
            <NavLink
              to="/"
              className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted flex items-center gap-1"
            >
              <Sparkles className="h-4 w-4" />
              予約ページ
            </NavLink>
          </nav>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <Select
            value={selectedStoreId || "all"}
            onValueChange={(value) => setSelectedStoreId(value === "all" ? null : value)}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[140px] sm:w-[200px]">
              <SelectValue placeholder="店舗を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全店舗</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="hidden sm:flex">
                <LogOut className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ログアウトしますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  {user?.email && `${user.email} からログアウトします。`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>ログアウト</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
}
