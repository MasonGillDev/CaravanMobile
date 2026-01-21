import axios from 'axios';
import Constants from 'expo-constants';

// Ticketmaster API configuration
const TICKETMASTER_API_KEY =
  Constants.expoConfig?.extra?.ticketmasterApiKey ||
  process.env.TICKETMASTER_API_KEY ||
  'YOUR_TICKETMASTER_API_KEY';
const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

export interface TicketmasterEvent {
  id: string;
  name: string;
  type: string;
  url: string;
  locale: string;
  images: Array<{
    url: string;
    width: number;
    height: number;
  }>;
  sales?: {
    public?: {
      startDateTime?: string;
      endDateTime?: string;
    };
  };
  dates: {
    start: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
    };
    timezone?: string;
    status?: {
      code: string;
    };
  };
  classifications?: Array<{
    primary: boolean;
    segment: {
      id: string;
      name: string;
    };
    genre: {
      id: string;
      name: string;
    };
    subGenre?: {
      id: string;
      name: string;
    };
  }>;
  priceRanges?: Array<{
    type: string;
    currency: string;
    min: number;
    max: number;
  }>;
  _embedded?: {
    venues?: Array<{
      name: string;
      city: {
        name: string;
      };
      state?: {
        name: string;
        stateCode: string;
      };
      country: {
        name: string;
        countryCode: string;
      };
      address?: {
        line1: string;
      };
      location?: {
        longitude: string;
        latitude: string;
      };
    }>;
  };
}

export interface TicketmasterResponse {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
  page: {
    size: number;
    totalElements: number;
    totalPages: number;
    number: number;
  };
}

class TicketmasterService {
  private static instance: TicketmasterService;
  private apiKey: string;

  private constructor() {
    this.apiKey = TICKETMASTER_API_KEY;
  }

  static getInstance(): TicketmasterService {
    if (!TicketmasterService.instance) {
      TicketmasterService.instance = new TicketmasterService();
    }
    return TicketmasterService.instance;
  }

  /**
   * Search for events by location (latitude/longitude)
   */
  async searchEventsByLocation(
    latitude: number,
    longitude: number,
    radiusMiles: number = 25,
    size: number = 20
  ): Promise<TicketmasterEvent[]> {
    try {
      const response = await axios.get<TicketmasterResponse>(
        `${BASE_URL}/events.json`,
        {
          params: {
            apikey: this.apiKey,
            latlong: `${latitude},${longitude}`,
            radius: radiusMiles,
            unit: 'miles',
            size,
            sort: 'date,asc', // Sort by date, earliest first
          },
        }
      );

      return response.data._embedded?.events || [];
    } catch (error) {
      console.error('Error fetching events by location:', error);
      throw error;
    }
  }

  /**
   * Search for concerts specifically (music events)
   */
  async searchConcertsByLocation(
    latitude: number,
    longitude: number,
    radiusMiles: number = 25,
    size: number = 20
  ): Promise<TicketmasterEvent[]> {
    try {
      const response = await axios.get<TicketmasterResponse>(
        `${BASE_URL}/events.json`,
        {
          params: {
            apikey: this.apiKey,
            latlong: `${latitude},${longitude}`,
            radius: radiusMiles,
            unit: 'miles',
            size,
            classificationName: 'Music', // Filter to music events only
            sort: 'date,asc',
          },
        }
      );

      return response.data._embedded?.events || [];
    } catch (error) {
      console.error('Error fetching concerts by location:', error);
      throw error;
    }
  }

  /**
   * Search events by city
   */
  async searchEventsByCity(
    city: string,
    stateCode?: string,
    size: number = 20
  ): Promise<TicketmasterEvent[]> {
    try {
      const params: any = {
        apikey: this.apiKey,
        city,
        size,
        sort: 'date,asc',
      };

      if (stateCode) {
        params.stateCode = stateCode;
      }

      const response = await axios.get<TicketmasterResponse>(
        `${BASE_URL}/events.json`,
        { params }
      );

      return response.data._embedded?.events || [];
    } catch (error) {
      console.error('Error fetching events by city:', error);
      throw error;
    }
  }

  /**
   * Search for specific genres
   */
  async searchEventsByGenre(
    latitude: number,
    longitude: number,
    genreName: string,
    radiusMiles: number = 25,
    size: number = 20
  ): Promise<TicketmasterEvent[]> {
    try {
      const response = await axios.get<TicketmasterResponse>(
        `${BASE_URL}/events.json`,
        {
          params: {
            apikey: this.apiKey,
            latlong: `${latitude},${longitude}`,
            radius: radiusMiles,
            unit: 'miles',
            size,
            genreName, // e.g., "Rock", "Pop", "Hip-Hop", "Country"
            sort: 'date,asc',
          },
        }
      );

      return response.data._embedded?.events || [];
    } catch (error) {
      console.error('Error fetching events by genre:', error);
      throw error;
    }
  }

  /**
   * Get event details by ID
   */
  async getEventById(eventId: string): Promise<TicketmasterEvent | null> {
    try {
      const response = await axios.get<TicketmasterEvent>(
        `${BASE_URL}/events/${eventId}.json`,
        {
          params: {
            apikey: this.apiKey,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching event by ID:', error);
      throw error;
    }
  }

  /**
   * Search upcoming events (next 30 days)
   */
  async searchUpcomingEvents(
    latitude: number,
    longitude: number,
    radiusMiles: number = 25,
    size: number = 20
  ): Promise<TicketmasterEvent[]> {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    try {
      const response = await axios.get<TicketmasterResponse>(
        `${BASE_URL}/events.json`,
        {
          params: {
            apikey: this.apiKey,
            latlong: `${latitude},${longitude}`,
            radius: radiusMiles,
            unit: 'miles',
            size,
            startDateTime: `${formatDate(now)}T00:00:00Z`,
            endDateTime: `${formatDate(endDate)}T23:59:59Z`,
            sort: 'date,asc',
          },
        }
      );

      return response.data._embedded?.events || [];
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      throw error;
    }
  }

  /**
   * Format event for display
   */
  formatEventForDisplay(event: TicketmasterEvent) {
    const venue = event._embedded?.venues?.[0];
    const priceRange = event.priceRanges?.[0];
    const genre = event.classifications?.[0]?.genre?.name;

    return {
      id: event.id,
      name: event.name,
      date: event.dates.start.localDate,
      time: event.dates.start.localTime,
      venueName: venue?.name,
      venueCity: venue?.city.name,
      venueState: venue?.state?.stateCode,
      address: venue?.address?.line1,
      image: event.images?.[0]?.url,
      url: event.url,
      genre,
      priceMin: priceRange?.min,
      priceMax: priceRange?.max,
      currency: priceRange?.currency,
      latitude: venue?.location?.latitude,
      longitude: venue?.location?.longitude,
    };
  }
}

export default TicketmasterService;
