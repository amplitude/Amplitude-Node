/**
 * Amplitude event definition.
 */
export interface Event {
  // Required
  event_type: string;
  // Semi required
  user_id?: string;
  device_id?: string;

  // Optional
  time?: number;
  country?: string;
  region?: string;
  city?: string;
  location_lat?: number;
  location_lng?: number;
  // ** The current Designated Market Area of the user. */
  dma?: string;
  language?: string;
  platform?: string;
  version_name?: string;
  library?: string;
  ip?: string;
  uuid?: string;
  event_properties?: { [key: string]: any };
  user_properties?: { [key: string]: any };

  price?: number;
  quantity?: number;
  revenue?: number;
  productId?: string;
  revenueType?: string;

  event_id?: number;
  session_id?: number;

  groups?: { [key: string]: any };
}
