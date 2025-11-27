import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, LayoutDashboard } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center space-y-6 p-8">
        <h1 className="mb-4 text-6xl font-bold">404</h1>
        <p className="mb-4 text-2xl font-semibold">ページが見つかりません</p>
        <p className="text-muted-foreground mb-8">
          お探しのページは移動または削除された可能性があります
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link to="/">
              <Home className="mr-2 h-5 w-5" />
              予約ページに戻る
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg">
            <Link to="/admin">
              <LayoutDashboard className="mr-2 h-5 w-5" />
              管理画面に戻る
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
