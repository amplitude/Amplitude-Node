/**
 * Strings that have special meaning when used as an event's type
 * and have different specifications.
 */
export enum SpecialEventType {
  IDENTIFY = '$identify',
  GROUP_IDENTIFY = '$groupidentify',
}

/**
 * Amplitude event definition.
 */
export interface BaseEvent {
  // Required
  event_type: Exclude<string, SpecialEventType>;
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

  app_version?: string;
  version_name?: string;
  library?: string;
  platform?: string;
  os_name?: string;
  os_version?: string;
  device_brand?: string;
  device_manufacturer?: string;
  device_model?: string;
  carrier?: string;

  idfa?: string;
  idfv?: string;
  adid?: string;
  android_id?: string;

  // ** The current Designated Market Area of the user. */
  dma?: string;
  language?: string;
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