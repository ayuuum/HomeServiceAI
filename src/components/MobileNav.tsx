import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, LayoutDashboard, Calendar, Sparkles } from "lucide-react";
import { NavLink } from "@/components/NavLink";

export function MobileNav() {
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
        </nav>
      </SheetContent>
    </Sheet>
  );
}
