// Utility functions to map between database snake_case and TypeScript camelCase

export const mapDbServiceToService = (dbService: any) => {
  return {
    id: dbService.id,
    title: dbService.title,
    description: dbService.description,
    basePrice: dbService.base_price,
    duration: dbService.duration,
    imageUrl: dbService.image_url,
    category: dbService.category,
    quantityDiscounts: dbService.quantity_discounts || [],
  };
};

export const mapServiceToDbService = (service: any) => {
  return {
    title: service.title,
    description: service.description,
    base_price: service.basePrice,
    duration: service.duration,
    image_url: service.imageUrl,
    category: service.category,
    quantity_discounts: service.quantityDiscounts || [],
  };
};

export const mapDbOptionToOption = (dbOption: any) => {
  return {
    id: dbOption.id,
    serviceId: dbOption.service_id,
    title: dbOption.title,
    price: dbOption.price,
    description: dbOption.description,
  };
};
