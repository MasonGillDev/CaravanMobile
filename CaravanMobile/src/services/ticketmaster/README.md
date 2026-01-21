# Ticketmaster Service

Service for fetching concerts and events using the Ticketmaster Discovery API.

## Setup

1. Get a Ticketmaster API key from: https://developer.ticketmaster.com/
2. Add to `.env`:
   ```
   TICKETMASTER_API_KEY=your_api_key_here
   ```

## Usage Examples

### Basic Concert Search

```typescript
import TicketmasterService from '../services/ticketmaster/ticketmasterService';

const ticketmasterService = TicketmasterService.getInstance();

// Search for concerts near a location
const concerts = await ticketmasterService.searchConcertsByLocation(
  40.7128, // latitude (NYC)
  -74.0060, // longitude
  25, // radius in miles
  20 // max results
);

console.log(`Found ${concerts.length} concerts`);
```

### Search Upcoming Events (Next 30 Days)

```typescript
const upcomingEvents = await ticketmasterService.searchUpcomingEvents(
  latitude,
  longitude,
  25 // radius in miles
);
```

### Search by Genre

```typescript
const rockConcerts = await ticketmasterService.searchEventsByGenre(
  latitude,
  longitude,
  'Rock', // Genre: Rock, Pop, Hip-Hop, Country, etc.
  25
);
```

### Search by City

```typescript
const cityEvents = await ticketmasterService.searchEventsByCity(
  'San Francisco',
  'CA', // optional state code
  50 // max results
);
```

### Get Event Details

```typescript
const event = await ticketmasterService.getEventById('event-id-here');
```

### Format Event for Display

```typescript
const concert = concerts[0];
const formatted = ticketmasterService.formatEventForDisplay(concert);

console.log(formatted);
// {
//   id: 'Z698xZC0Za...',
//   name: 'Taylor Swift | The Eras Tour',
//   date: '2024-12-15',
//   time: '19:00:00',
//   venueName: 'Madison Square Garden',
//   venueCity: 'New York',
//   venueState: 'NY',
//   image: 'https://...',
//   url: 'https://ticketmaster.com/...',
//   genre: 'Pop',
//   priceMin: 50,
//   priceMax: 500,
//   currency: 'USD',
//   latitude: '40.7505',
//   longitude: '-73.9934'
// }
```

## Example Component

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, Linking } from 'react-native';
import TicketmasterService from '../services/ticketmaster/ticketmasterService';

export const ConcertsScreen = () => {
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const ticketmasterService = TicketmasterService.getInstance();

  useEffect(() => {
    loadConcerts();
  }, []);

  const loadConcerts = async () => {
    try {
      // Get user's current location (you'd get this from LocationService)
      const latitude = 40.7128;
      const longitude = -74.0060;

      const events = await ticketmasterService.searchConcertsByLocation(
        latitude,
        longitude,
        25,
        20
      );

      setConcerts(events);
    } catch (error) {
      console.error('Error loading concerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderConcert = ({ item }) => {
    const concert = ticketmasterService.formatEventForDisplay(item);

    return (
      <TouchableOpacity
        style={styles.concertCard}
        onPress={() => Linking.openURL(concert.url)}
      >
        <Image source={{ uri: concert.image }} style={styles.image} />
        <View style={styles.info}>
          <Text style={styles.name}>{concert.name}</Text>
          <Text style={styles.venue}>{concert.venueName}</Text>
          <Text style={styles.date}>
            {concert.date} {concert.time && `at ${concert.time}`}
          </Text>
          {concert.priceMin && (
            <Text style={styles.price}>
              ${concert.priceMin} - ${concert.priceMax}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Text>Loading concerts...</Text>;
  }

  return (
    <FlatList
      data={concerts}
      renderItem={renderConcert}
      keyExtractor={(item) => item.id}
    />
  );
};
```

## API Methods

### `searchEventsByLocation(latitude, longitude, radiusMiles?, size?)`
Search for all events near a location.
- **Returns:** `Promise<TicketmasterEvent[]>`

### `searchConcertsByLocation(latitude, longitude, radiusMiles?, size?)`
Search for music events only near a location.
- **Returns:** `Promise<TicketmasterEvent[]>`

### `searchEventsByCity(city, stateCode?, size?)`
Search for events in a specific city.
- **Returns:** `Promise<TicketmasterEvent[]>`

### `searchEventsByGenre(latitude, longitude, genreName, radiusMiles?, size?)`
Search for events by genre (Rock, Pop, Hip-Hop, Country, etc.).
- **Returns:** `Promise<TicketmasterEvent[]>`

### `searchUpcomingEvents(latitude, longitude, radiusMiles?, size?)`
Search for events in the next 30 days.
- **Returns:** `Promise<TicketmasterEvent[]>`

### `getEventById(eventId)`
Get detailed information for a specific event.
- **Returns:** `Promise<TicketmasterEvent | null>`

### `formatEventForDisplay(event)`
Format a Ticketmaster event for easier display.
- **Returns:** Formatted event object

## Event Data Structure

The service returns `TicketmasterEvent` objects with:
- `id` - Unique event ID
- `name` - Event name
- `url` - Ticketmaster URL for tickets
- `images` - Array of event images
- `dates` - Start date, time, timezone
- `classifications` - Genre, segment information
- `priceRanges` - Min/max ticket prices
- `_embedded.venues` - Venue information (name, address, location)

## Integration with Caravan

You can integrate this with the existing location service:

```typescript
import LocationService from '../services/location/locationService';
import TicketmasterService from '../services/ticketmaster/ticketmasterService';

const locationService = LocationService.getInstance();
const ticketmasterService = TicketmasterService.getInstance();

// Get current location
const location = await locationService.getCurrentLocation();

// Find nearby concerts
const concerts = await ticketmasterService.searchConcertsByLocation(
  location.coords.latitude,
  location.coords.longitude,
  25
);
```

## Notes

- Free tier allows 5,000 API calls per day
- Results are sorted by date (earliest first)
- Distance is calculated in miles
- Prices are in the venue's local currency
