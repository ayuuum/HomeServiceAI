import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/ui/icon";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";

export function MobileNav() {
  const { signOut, user, organization } = useAuth();
  const navigate = useNavigate();
  
  const bookingPageUrl = organization?.slug && organization.slug !== 'default' 
    ? `/booking/${organization.slug}` 
    : '/';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Icon name="menu" size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <img src="/images/logo.png" alt="ハウクリPro" className="h-8 w-auto" />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-3 mt-8">
          <NavLink
            to="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
            activeClassName="bg-muted text-primary font-medium"
          >
            <Icon name="dashboard" size={20} />
            ダッシュボード
          </NavLink>
          <NavLink
            to="/admin/customers"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
            activeClassName="bg-muted text-primary font-medium"
          >
            <Icon name="group" size={20} />
            顧客管理
          </NavLink>
          <NavLink
            to="/admin/calendar"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
            activeClassName="bg-muted text-primary font-medium"
          >
            <Icon name="event_note" size={20} />
            予約管理
          </NavLink>
          <NavLink
            to="/admin/reports"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
            activeClassName="bg-muted text-primary font-medium"
          >
            <Icon name="description" size={20} />
            経営管理
          </NavLink>

          <a
            href={bookingPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
          >
            <Icon name="auto_awesome" size={20} />
            予約ページ
            <Icon name="open_in_new" size={14} className="ml-auto text-muted-foreground" />
          </a>
          <NavLink
            to="/admin/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
            activeClassName="bg-muted text-primary font-medium"
          >
            <Icon name="settings" size={20} />
            設定
          </NavLink>

          <Separator className="my-4" />

          {user && (
            <div className="px-3 py-2 space-y-3">
              <div className="text-xs text-muted-foreground">
                ログイン中: {user.email}
              </div>
              <SheetClose asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={handleLogout}
                >
                  <Icon name="logout" size={20} />
                  ログアウト
                </Button>
              </SheetClose>
            </div>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}