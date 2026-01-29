export interface Service {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  duration: number;
  imageUrl: string;
  category: string;
  quantityDiscounts?: Array<{
    min_quantity: number;
    discount_rate: number;
  }>;
}

export interface ServiceOption {
  id: string;
  serviceId: string;
  title: string;
  price: number;
  description?: string;
}

export interface SelectedOptionWithQuantity extends ServiceOption {
  quantity: number;
}

export interface BookingState {
  selectedService?: Service;
  selectedOptions: SelectedOptionWithQuantity[];
  serviceQuantity?: number;
  selectedDate?: Date;
  selectedTime?: string;
  diagnosis?: {
    hasParking: boolean;
    photos: File[];
    notes: string;
  };
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  totalPrice: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  selectedDate: string;
  selectedTime: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerAddressBuilding?: string;
  customerPostalCode?: string;
  serviceQuantity: number;
  diagnosisHasParking?: boolean;
  diagnosisNotes?: string;
  optionsSummary: string[];
  createdAt: string;
  customerId?: string;
  // 希望日時（3つ）
  preference1Date?: string;
  preference1Time?: string;
  preference2Date?: string;
  preference2Time?: string;
  preference3Date?: string;
  preference3Time?: string;
  // 承認された希望番号（1, 2, or 3）
  approvedPreference?: number;
}

export interface Customer {
  id: string;
  lineUserId?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  addressBuilding?: string;
  postalCode?: string;
  bookingCount?: number;
  totalSpend?: number;
  notes?: string;
}