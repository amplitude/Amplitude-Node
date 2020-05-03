/**
 * Amplitude event definition.
 */
export interface Event {
  // Required
  event_type: string;
  user_id: string;
  time: number;

  // Optional
  country?: string;
  region?: string;
  city?: string;
  location_lat: number;
  location_lng: number;
  // ** The current Designated Market Area of the user. */
  dma?: string;
  language?: string;
  device_id?: string;
  platform?: string;
  version_name?: string;
  library?: string;
  ip?: string;
  uuid?: string;
  event_properties?: Record<string, any>;
  user_properties?: Record<string, any>;

  price?: number;
  quantity?: number;
  revenue?: number;
  productId?: string;
  revenueType: string;

  event_id: number;
  session_id: number;

  groups?: Record<string, any>;
}
