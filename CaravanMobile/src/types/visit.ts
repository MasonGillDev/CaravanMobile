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
  user_rating?: number; // User's rating for this visit (1-5)
}

export interface VisitsResponse {
  success: boolean;
  visits: Visit[];
}
