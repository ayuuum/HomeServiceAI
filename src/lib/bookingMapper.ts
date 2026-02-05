// Utility functions to map between database snake_case and TypeScript camelCase

export const mapDbBookingToBooking = (dbBooking: any) => {
  const bookingServices = (dbBooking.booking_services || []) as any[];
  const bookingOptions = (dbBooking.booking_options || []) as any[];
  
  // For backward compatibility, use the first service if available
  const firstService = bookingServices[0];
  const serviceName = bookingServices.length > 1 
    ? `${firstService?.service_title}他${bookingServices.length - 1}件` 
    : firstService?.service_title || "不明なサービス";
  
  return {
    id: dbBooking.id,
    serviceId: firstService?.service_id || "",
    serviceName,
    customerName: dbBooking.customer_name,
    customerEmail: dbBooking.customer_email,
    customerPhone: dbBooking.customer_phone,
    customerAddress: dbBooking.customer_address,
    customerAddressBuilding: dbBooking.customer_address_building,
    customerPostalCode: dbBooking.customer_postal_code,
    serviceQuantity: firstService?.service_quantity || 1,
    selectedDate: dbBooking.selected_date,
    selectedTime: dbBooking.selected_time,
    totalPrice: dbBooking.total_price,
    finalAmount: dbBooking.final_amount,
    status: dbBooking.status,
    diagnosisHasParking: dbBooking.diagnosis_has_parking,
    diagnosisNotes: dbBooking.diagnosis_notes,
    optionsSummary: bookingOptions.map((opt: any) => 
      opt.option_quantity > 1 
        ? `${opt.option_title} × ${opt.option_quantity}個` 
        : opt.option_title
    ),
    createdAt: dbBooking.created_at,
    customerId: dbBooking.customer_id,
    // GMV課金関連
    paymentMethod: dbBooking.payment_method,
    collectedAt: dbBooking.collected_at,
    gmvIncludedAt: dbBooking.gmv_included_at,
    onlinePaymentStatus: dbBooking.online_payment_status,
    additionalCharges: dbBooking.additional_charges,
    // 希望日時（3つ）
    preference1Date: dbBooking.preference1_date,
    preference1Time: dbBooking.preference1_time,
    preference2Date: dbBooking.preference2_date,
    preference2Time: dbBooking.preference2_time,
    preference3Date: dbBooking.preference3_date,
    preference3Time: dbBooking.preference3_time,
    // 承認された希望番号
    approvedPreference: dbBooking.approved_preference,
    // Payment fields
    paymentStatus: dbBooking.payment_status,
    stripeCheckoutSessionId: dbBooking.stripe_checkout_session_id,
    stripePaymentIntentId: dbBooking.stripe_payment_intent_id,
    paidAt: dbBooking.paid_at,
    refundedAt: dbBooking.refunded_at,
    refundAmount: dbBooking.refund_amount,
  };
};

export const mapBookingToDbBooking = (booking: any) => {
  return {
    service_id: booking.serviceId,
    customer_name: booking.customerName,
    customer_email: booking.customerEmail,
    customer_phone: booking.customerPhone,
    customer_address: booking.customerAddress,
    customer_address_building: booking.customerAddressBuilding,
    customer_postal_code: booking.customerPostalCode,
    service_quantity: booking.serviceQuantity,
    selected_date: booking.selectedDate,
    selected_time: booking.selectedTime,
    total_price: booking.totalPrice,
    status: booking.status,
    diagnosis_has_parking: booking.diagnosisHasParking,
    diagnosis_notes: booking.diagnosisNotes,
  };
};