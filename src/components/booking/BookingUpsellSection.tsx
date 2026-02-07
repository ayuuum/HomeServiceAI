import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpsellOption {
  id: string;
  title: string;
  price: number;
  description?: string;
}

interface BookingUpsellSectionProps {
  allOptions: UpsellOption[];
  selectedOptionIds: string[];
  onAddOption: (optionId: string, checked: boolean) => void;
}

export function BookingUpsellSection({
  allOptions,
  selectedOptionIds,
  onAddOption,
}: BookingUpsellSectionProps) {
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  const unselectedOptions = allOptions.filter(
    (opt) => !selectedOptionIds.includes(opt.id) && !justAdded.has(opt.id)
  );

  if (unselectedOptions.length === 0) return null;

  const handleAdd = (optionId: string) => {
    onAddOption(optionId, true);
    setJustAdded((prev) => new Set(prev).add(optionId));
  };

  return (
    <section className="rounded-lg border border-accent/30 bg-accent/5 p-4">
      <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
        <Sparkles className="w-4 h-4 text-accent" />
        よく一緒に選ばれているオプション
      </h3>
      <div className="space-y-2">
        {unselectedOptions.map((option) => (
          <div
            key={option.id}
            className="flex items-center justify-between gap-3 rounded-md border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{option.title}</p>
              <p className="text-xs text-muted-foreground">
                ¥{option.price.toLocaleString()}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-8 text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => handleAdd(option.id)}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              追加
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
