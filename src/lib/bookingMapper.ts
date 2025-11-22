// Utility functions to map between database snake_case and TypeScript camelCase

export const mapDbBookingToBooking = (dbBooking: any) => {
  return {
    id: dbBooking.id,
    serviceId: dbBooking.service_id,
    serviceName: dbBooking.services?.title || '',
    customerName: dbBooking.customer_name,
    customerEmail: dbBooking.customer_email,
    customerPhone: dbBooking.customer_phone,
    serviceQuantity: dbBooking.service_quantity,
    selectedDate: dbBooking.selected_date,
    selectedTime: dbBooking.selected_time,
    totalPrice: dbBooking.total_price,
    status: dbBooking.status,
    diagnosisHasParking: dbBooking.diagnosis_has_parking,
    diagnosisNotes: dbBooking.diagnosis_notes,
    optionsSummary: dbBooking.booking_options?.map((opt: any) => 
      opt.option_quantity > 1 
        ? `${opt.option_title} × ${opt.option_quantity}個` 
        : opt.option_title
    ) || [],
    createdAt: dbBooking.created_at,
  };
};

export const mapBookingToDbBooking = (booking: any) => {
  return {
    service_id: booking.serviceId,
    customer_name: booking.customerName,
    customer_email: booking.customerEmail,
    customer_phone: booking.customerPhone,
    service_quantity: booking.serviceQuantity,
    selected_date: booking.selectedDate,
    selected_time: booking.selectedTime,
    total_price: booking.totalPrice,
    status: booking.status,
    diagnosis_has_parking: booking.diagnosisHasParking,
    diagnosis_notes: booking.diagnosisNotes,
  };
};
