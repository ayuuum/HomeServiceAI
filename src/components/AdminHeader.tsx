import { Building2, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/contexts/StoreContext";
import { MobileNav } from "@/components/MobileNav";
import { NavLink } from "@/components/NavLink";

export function AdminHeader() {
  const { selectedStoreId, setSelectedStoreId, stores, isLoading } = useStore();

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
              to="/"
              className="px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted flex items-center gap-1"
            >
              <Sparkles className="h-4 w-4" />
              予約ページ
            </NavLink>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
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
        </div>
      </div>
    </header>
  );
}
