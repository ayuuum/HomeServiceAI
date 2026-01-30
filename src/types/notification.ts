export type NotificationType = 'new_booking' | 'booking_cancelled' | 'line_message';
export type ResourceType = 'booking' | 'customer' | 'line_message';

export interface Notification {
  id: string;
  organization_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  resource_type: ResourceType | null;
  resource_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationInsert {
  organization_id: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  resource_type?: ResourceType | null;
  resource_id?: string | null;
}
