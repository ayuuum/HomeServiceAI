import { Icon } from "@/components/ui/icon";
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
import { useAuth } from "@/contexts/AuthContext";
import { MobileNav } from "@/components/MobileNav";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";

export function AdminHeader() {
  const { signOut, user, organization } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Build booking page URL with organization slug (using public URL for customer sharing)
  const publicBaseUrl = import.meta.env.VITE_PUBLIC_URL || 'https://cleaning-booking.lovable.app';
  const bookingPageUrl = organization?.slug && organization.slug !== 'default'
    ? `${publicBaseUrl}/booking/${organization.slug}`
    : publicBaseUrl;

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MobileNav />

          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="ハウクリPro" className="h-8 w-auto" />
            {organization && organization.name !== 'Default Organization' && (
              <span className="text-sm font-medium text-muted-foreground border-l pl-3 hidden sm:inline">
                {organization.name}
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
            <NavLink
              to="/admin"
              end
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted"
              activeClassName="bg-muted text-primary"
            >
              <Icon name="dashboard" size={16} />
              ダッシュボード
            </NavLink>
            <NavLink
              to="/admin/customers"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted"
              activeClassName="bg-muted text-primary"
            >
              <Icon name="group" size={16} />
              顧客管理
            </NavLink>
            <NavLink
              to="/admin/calendar"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted"
              activeClassName="bg-muted text-primary"
            >
              <Icon name="event_note" size={16} />
              予約管理
            </NavLink>
            <NavLink
              to="/admin/inbox"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted"
              activeClassName="bg-muted text-primary"
            >
              <Icon name="inbox" size={16} />
              受信トレイ
            </NavLink>
            <NavLink
              to="/admin/broadcast"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted"
              activeClassName="bg-muted text-primary"
            >
              <Icon name="campaign" size={16} />
              一斉配信
            </NavLink>
            <NavLink
              to="/admin/reports"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted"
              activeClassName="bg-muted text-primary"
            >
              <Icon name="description" size={16} />
              経営管理
            </NavLink>
            <a
              href={bookingPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <Icon name="auto_awesome" size={16} />
              予約ページ
              <Icon name="open_in_new" size={14} className="ml-0.5" />
            </a>
            <NavLink
              to="/admin/profile"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted"
              activeClassName="bg-muted text-primary"
            >
              <Icon name="settings" size={16} />
              設定
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="hidden sm:flex">
                <Icon name="logout" size={16} />
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