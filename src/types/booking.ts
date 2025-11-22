export interface Service {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  duration: number;
  imageUrl: string;
  category: string;
}

export interface ServiceOption {
  id: string;
  serviceId: string;
  title: string;
  price: number;
  description?: string;
}

export interface BookingState {
  selectedService?: Service;
  selectedOptions: ServiceOption[];
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
  optionsSummary: string[];
  createdAt: string;
}
