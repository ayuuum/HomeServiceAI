const STORAGE_KEY = 'booking_form_data';
const STORAGE_EXPIRY_HOURS = 24;

export interface StoredBookingData {
  selectedServices: { serviceId: string; quantity: number }[];
  selectedOptions: { optionId: string; quantity: number }[];
  selectedDate: string | null;
  selectedTime: string | null;
  hasParking: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerPostalCode: string;
  customerAddress: string;
  notes: string;
  organizationId: string;
  savedAt: number;
}

export const useBookingStorage = (organizationId: string) => {
  const loadBookingData = (): StoredBookingData | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const data: StoredBookingData = JSON.parse(stored);
      
      // Check expiry (24 hours)
      if (Date.now() - data.savedAt > STORAGE_EXPIRY_HOURS * 60 * 60 * 1000) {
        clearBookingData();
        return null;
      }
      
      // Check organization ID matches
      if (data.organizationId !== organizationId) {
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error loading booking data:', error);
      return null;
    }
  };

  const saveBookingData = (data: Partial<Omit<StoredBookingData, 'organizationId' | 'savedAt'>>) => {
    try {
      const existing = loadBookingData();
      const updated: StoredBookingData = {
        selectedServices: data.selectedServices ?? existing?.selectedServices ?? [],
        selectedOptions: data.selectedOptions ?? existing?.selectedOptions ?? [],
        selectedDate: data.selectedDate ?? existing?.selectedDate ?? null,
        selectedTime: data.selectedTime ?? existing?.selectedTime ?? null,
        hasParking: data.hasParking ?? existing?.hasParking ?? "",
        customerName: data.customerName ?? existing?.customerName ?? "",
        customerEmail: data.customerEmail ?? existing?.customerEmail ?? "",
        customerPhone: data.customerPhone ?? existing?.customerPhone ?? "",
        customerPostalCode: data.customerPostalCode ?? existing?.customerPostalCode ?? "",
        customerAddress: data.customerAddress ?? existing?.customerAddress ?? "",
        notes: data.notes ?? existing?.notes ?? "",
        organizationId,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving booking data:', error);
    }
  };

  const clearBookingData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing booking data:', error);
    }
  };

  return { saveBookingData, loadBookingData, clearBookingData };
};
