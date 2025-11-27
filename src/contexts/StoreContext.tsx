import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Store } from "@/types/booking";

interface StoreContextType {
  selectedStoreId: string | null;
  setSelectedStoreId: (id: string | null) => void;
  stores: Store[];
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("is_hq", { ascending: false })
        .order("name");

      if (error) throw error;

      const mappedStores: Store[] = (data || []).map((store) => ({
        id: store.id,
        name: store.name,
        lineChannelToken: store.line_channel_token || undefined,
        lineChannelSecret: store.line_channel_secret || undefined,
        isHq: store.is_hq || false,
      }));

      setStores(mappedStores);
    } catch (error) {
      console.error("Error fetching stores:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StoreContext.Provider
      value={{ selectedStoreId, setSelectedStoreId, stores, isLoading }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
