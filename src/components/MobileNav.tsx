import { Link, useNavigate } from "react-router-dom";
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
import { Menu, LayoutDashboard, Calendar, Sparkles, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";

export function MobileNav() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            ServiceBook
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-3 mt-8">
          <NavLink
            to="/admin"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
            activeClassName="bg-muted text-primary font-medium"
          >
            <LayoutDashboard className="h-5 w-5" />
            ダッシュボード
          </NavLink>
          <NavLink
            to="/admin/schedule"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
            activeClassName="bg-muted text-primary font-medium"
          >
            <Calendar className="h-5 w-5" />
            スタッフ配置
          </NavLink>
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
          >
            <Sparkles className="h-5 w-5" />
            予約ページ
          </Link>

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
                  <LogOut className="h-5 w-5" />
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
