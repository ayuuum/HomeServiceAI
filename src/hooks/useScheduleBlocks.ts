import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ScheduleBlock {
  id: string;
  organizationId: string;
  blockDate: string;
  blockTime: string | null;
  blockType: "holiday" | "vacation" | "maintenance" | "other";
  title: string | null;
  notes: string | null;
}

export function useScheduleBlocks() {
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(false);

  const createBlock = useCallback(
    async (
      blockDate: string,
      blockTime: string | null,
      blockType: "holiday" | "vacation" | "maintenance" | "other" = "other",
      title?: string
    ) => {
      if (!organizationId) {
        toast.error("組織情報が取得できません");
        return null;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("schedule_blocks")
          .insert({
            organization_id: organizationId,
            block_date: blockDate,
            block_time: blockTime,
            block_type: blockType,
            title: title || null,
          })
          .select()
          .single();

        if (error) throw error;

        toast.success(
          blockTime
            ? `${blockDate} ${blockTime} をブロックしました`
            : `${blockDate} を終日ブロックしました`
        );
        return data;
      } catch (error) {
        console.error("Error creating block:", error);
        toast.error("ブロックの作成に失敗しました");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [organizationId]
  );

  const deleteBlock = useCallback(
    async (blockId: string) => {
      if (!organizationId) {
        toast.error("組織情報が取得できません");
        return false;
      }

      setLoading(true);
      try {
        const { error } = await supabase
          .from("schedule_blocks")
          .delete()
          .eq("id", blockId);

        if (error) throw error;

        toast.success("ブロックを解除しました");
        return true;
      } catch (error) {
        console.error("Error deleting block:", error);
        toast.error("ブロックの削除に失敗しました");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [organizationId]
  );

  return {
    loading,
    createBlock,
    deleteBlock,
  };
}
