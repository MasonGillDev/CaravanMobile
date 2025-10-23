export interface Visit {
  session_id: string;
  arrival_time: string;
  departure_time?: string;
  dwell_minutes?: number;
  status: string;
  place_id: string;
  place_name: string;
  place_address: string;
  place_city: string;
  place_state: string;
  place_rating?: number;
  place_price?: string;
}

export interface VisitsResponse {
  success: boolean;
  visits: Visit[];
}
