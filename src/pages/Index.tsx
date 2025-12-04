import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <img src={logo} alt="ハウクリPro" className="h-16 mx-auto mb-6" />
        <p className="text-xl text-muted-foreground mb-8">サービス予約管理システム</p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link to="/admin">管理画面へ</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/login">ログイン</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
