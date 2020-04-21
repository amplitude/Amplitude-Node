export interface Event {
    event_type: string;
    user_id: string;
    time: number;

    device_id?: string;
    platform?: string;
    version_name?: string;
    library?: string;
    country?: string;
    ip?: string;
    uuid?: string;
    event_properties?: Record<string, any>;
    user_properties?: Record<string, any>;
  }