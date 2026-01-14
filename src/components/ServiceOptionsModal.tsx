import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Service, ServiceOption } from "@/types/booking";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { mapDbOptionToOption } from "@/lib/serviceMapper";
import { useAuth } from "@/contexts/AuthContext";

interface ServiceOptionsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    service: Service | null;
}

export const ServiceOptionsModal = ({
    open,
    onOpenChange,
    service,
}: ServiceOptionsModalProps) => {
    const [options, setOptions] = useState<ServiceOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [newOptionTitle, setNewOptionTitle] = useState("");
    const [newOptionPrice, setNewOptionPrice] = useState("");
    const [adding, setAdding] = useState(false);
    const { organizationId } = useAuth();

    useEffect(() => {
        if (open && service) {
            fetchOptions();
        } else {
            setOptions([]);
            setNewOptionTitle("");
            setNewOptionPrice("");
        }
    }, [open, service]);

    const fetchOptions = async () => {
        if (!service) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("service_options")
            .select("*")
            .eq("service_id", service.id)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching options:", error);
            toast.error("オプションの読み込みに失敗しました");
        } else {
            setOptions((data || []).map(mapDbOptionToOption));
        }
        setLoading(false);
    };

    const handleAddOption = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!service || !newOptionTitle || !newOptionPrice) return;

        if (!organizationId) {
            toast.error("組織IDが見つかりません");
            return;
        }

        setAdding(true);
        const { data, error } = await supabase
            .from("service_options")
            .insert({
                service_id: service.id,
                title: newOptionTitle,
                price: parseInt(newOptionPrice),
                organization_id: organizationId
            })
            .select()
            .single();

        if (error) {
            console.error("Error adding option:", error);
            toast.error("オプションの追加に失敗しました");
        } else {
            toast.success("オプションを追加しました");
            setOptions([...options, mapDbOptionToOption(data)]);
            setNewOptionTitle("");
            setNewOptionPrice("");
        }
        setAdding(false);
    };

    const handleDeleteOption = async (optionId: string) => {
        const { error } = await supabase
            .from("service_options")
            .delete()
            .eq("id", optionId);

        if (error) {
            console.error("Error deleting option:", error);
            toast.error("オプションの削除に失敗しました");
        } else {
            toast.success("オプションを削除しました");
            setOptions(options.filter((o) => o.id !== optionId));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>オプション管理: {service?.title}</DialogTitle>
                    <DialogDescription>
                        このサービスのオプションメニューを追加・削除できます
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Add New Option Form */}
                    <form onSubmit={handleAddOption} className="space-y-4 p-4 border rounded-lg bg-muted/50">
                        <h4 className="font-medium text-sm">新しいオプションを追加</h4>
                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="optionTitle" className="text-xs">オプション名</Label>
                                <Input
                                    id="optionTitle"
                                    value={newOptionTitle}
                                    onChange={(e) => setNewOptionTitle(e.target.value)}
                                    placeholder="例: 防カビコーティング"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="optionPrice" className="text-xs">価格 (円)</Label>
                                <Input
                                    id="optionPrice"
                                    type="number"
                                    value={newOptionPrice}
                                    onChange={(e) => setNewOptionPrice(e.target.value)}
                                    placeholder="3000"
                                    min="0"
                                    required
                                />
                            </div>
                            <Button type="submit" size="sm" className="w-full" disabled={adding}>
                                {adding ? (
                                    <Icon name="sync" size={16} className="animate-spin mr-2" />
                                ) : (
                                    <Icon name="add" size={16} className="mr-2" />
                                )}
                                追加する
                            </Button>
                        </div>
                    </form>

                    {/* Options List */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">登録済みオプション</h4>
                        {loading ? (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                                読み込み中...
                            </div>
                        ) : options.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg border-dashed">
                                オプションはまだありません
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {options.map((option) => (
                                    <div
                                        key={option.id}
                                        className="flex items-center justify-between p-3 border rounded-lg bg-card"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">{option.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                ¥{option.price.toLocaleString()}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleDeleteOption(option.id)}
                                        >
                                            <Icon name="delete" size={16} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
