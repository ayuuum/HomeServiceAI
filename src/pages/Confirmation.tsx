import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Service, ServiceOption } from "@/types/booking";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";

const Confirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    service,
    selectedOptions,
    totalPrice,
    selectedDate,
    selectedTime,
    diagnosis,
  } = location.state as {
    service: Service;
    selectedOptions: ServiceOption[];
    totalPrice: number;
    selectedDate: Date;
    selectedTime: string;
    diagnosis: {
      hasParking: boolean;
      notes: string;
    };
  };

  const handleSubmit = () => {
    toast.success("予約リクエストを送信しました！", {
      description: "事業者からの確認連絡をお待ちください",
    });
    // In real app, save to database here
    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">予約内容の確認</h1>
              <p className="text-sm text-muted-foreground">5 / 5</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="container max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Service Info */}
            <div>
              <h3 className="font-semibold text-lg mb-4">サービス内容</h3>
              <div className="flex gap-4">
                <img
                  src={service.imageUrl}
                  alt={service.title}
                  className="w-24 h-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="font-semibold mb-1">{service.title}</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {service.description}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>{service.duration}分</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Selected Options */}
            {selectedOptions.length > 0 && (
              <>
                <div>
                  <h3 className="font-semibold text-lg mb-3">選択オプション</h3>
                  <div className="space-y-2">
                    {selectedOptions.map((option) => (
                      <div
                        key={option.id}
                        className="flex justify-between items-start text-sm"
                      >
                        <span className="text-muted-foreground">
                          • {option.title}
                        </span>
                        <span className="font-medium">
                          +¥{option.price.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Date & Time */}
            <div>
              <h3 className="font-semibold text-lg mb-3">予約日時</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {format(selectedDate, "yyyy年M月d日(E)", { locale: ja })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="font-medium">{selectedTime}〜</span>
                  <span className="text-sm bg-success/10 text-success px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    即予約可能
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Info */}
            <div>
              <h3 className="font-semibold text-lg mb-3">その他の情報</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">駐車場</span>
                  <span className="font-medium">
                    {diagnosis.hasParking ? "あり" : "なし"}
                  </span>
                </div>
                {diagnosis.notes && (
                  <div>
                    <span className="text-muted-foreground block mb-1">
                      備考
                    </span>
                    <p className="bg-muted/50 p-3 rounded-lg">
                      {diagnosis.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Price Summary */}
            <div>
              <h3 className="font-semibold text-lg mb-3">料金</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">基本料金</span>
                  <span>¥{service.basePrice.toLocaleString()}</span>
                </div>
                {selectedOptions.map((option) => (
                  <div
                    key={option.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {option.title}
                    </span>
                    <span>¥{option.price.toLocaleString()}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-baseline pt-2">
                  <span className="font-semibold text-lg">合計金額</span>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      ¥{totalPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">税込</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            ※ この段階ではまだ予約は確定していません。
            <br />
            事業者からの確認連絡をお待ちください。
          </p>
        </div>
      </section>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50">
        <div className="container max-w-2xl mx-auto">
          <Button
            size="lg"
            className="w-full btn-primary"
            onClick={handleSubmit}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            予約リクエストを送る
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;
