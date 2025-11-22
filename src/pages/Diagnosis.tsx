import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Upload, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/StickyFooter";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Service, ServiceOption } from "@/types/booking";

const Diagnosis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    service: Service;
    selectedOptions: ServiceOption[];
    serviceQuantity?: number;
    totalPrice: number;
    selectedDate: Date;
    selectedTime: string;
  } | null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasParking, setHasParking] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!state?.service) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  useEffect(() => {
    return () => {
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  if (!state?.service) {
    return null;
  }

  const { service, selectedOptions, serviceQuantity = 1, totalPrice, selectedDate, selectedTime } = state;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedPhotos(prev => [...prev, ...files]);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPhotoPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemovePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    navigate("/confirmation", {
      state: {
        service,
        selectedOptions,
        serviceQuantity,
        totalPrice,
        selectedDate,
        selectedTime,
        diagnosis: {
          hasParking: hasParking === "yes",
          photos: selectedPhotos,
          notes,
        },
      },
    });
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
              <h1 className="font-semibold">事前確認</h1>
              <p className="text-sm text-muted-foreground">4 / 5</p>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <section className="container max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">現場の状況を教えてください</h3>
          <p className="text-sm text-muted-foreground mb-6">
            スムーズな作業のため、いくつか質問にお答えください
          </p>

          {/* Parking Question */}
          <div className="space-y-4">
            <div className="p-6 rounded-lg border border-border bg-card">
              <Label className="text-base font-semibold mb-4 block">
                駐車場はありますか？
              </Label>
              <RadioGroup value={hasParking} onValueChange={setHasParking}>
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="yes" id="yes" />
                  <Label htmlFor="yes" className="cursor-pointer flex-1">
                    はい、あります
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="no" id="no" />
                  <Label htmlFor="no" className="cursor-pointer flex-1">
                    いいえ、ありません
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Photo Upload UI */}
            <div className="p-6 rounded-lg border border-border bg-card">
              <Label className="text-base font-semibold mb-4 block">
                現場の写真（任意）
              </Label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleRemovePhoto(index)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">
                  写真をアップロード
                </p>
                <p className="text-xs text-muted-foreground">
                  作業箇所の写真があると、より正確な対応が可能です
                </p>
                <Button variant="outline" className="mt-4" size="sm" type="button">
                  <Upload className="h-4 w-4 mr-2" />
                  ファイルを選択
                </Button>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="p-6 rounded-lg border border-border bg-card">
              <Label htmlFor="notes" className="text-base font-semibold mb-4 block">
                その他、伝えておきたいこと（任意）
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例：ペットがいます、作業時間の制約があります、など"
                className="min-h-[120px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Footer */}
      <StickyFooter
        totalPrice={totalPrice}
        onNext={handleNext}
        buttonText="確認画面へ"
      />
    </div>
  );
};

export default Diagnosis;
