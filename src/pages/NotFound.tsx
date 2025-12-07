
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center space-y-6 p-8 bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="text-xl text-gray-600">ページが見つかりません</p>
        <p className="text-gray-500">
          お探しのページは削除されたか、URLが変更された可能性があります。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button asChild variant="default" className="w-full sm:w-auto">
            <Link to="/">
              <Icon name="home" size={16} className="mr-2" />
              トップページへ
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/admin">
              <Icon name="dashboard" size={16} className="mr-2" />
              管理画面へ
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
