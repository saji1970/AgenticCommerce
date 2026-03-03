import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'sky-scrapper3.p.rapidapi.com';

const headers = {
  'X-RapidAPI-Key': RAPIDAPI_KEY,
  'X-RapidAPI-Host': RAPIDAPI_HOST,
};

// ── Sky Scrapper API helpers ──────────────────────────────────────────

interface SkyEntity {
  skyId: string;
  entityId: string;
  presentation: { title: string; subtitle: string };
}

async function autoSuggest(query: string): Promise<SkyEntity | null> {
  const paths = [
    '/api/v1/flights/searchAirport',
    '/api/v2/flights/searchAirport',
    '/api/v1/flights/auto-complete',
  ];

  for (const path of paths) {
    try {
      const { data } = await axios.get(
        `https://${RAPIDAPI_HOST}${path}`,
        { headers, params: { query, locale: 'en-US' }, timeout: 10000 }
      );
      const places = data?.data;
      if (Array.isArray(places) && places.length > 0) {
        return {
          skyId: places[0].skyId,
          entityId: places[0].entityId,
          presentation: places[0].presentation ?? { title: query, subtitle: '' },
        };
      }
    } catch (err: any) {
      if (err.response?.status === 404) continue; // Try next path
      console.error('autoSuggest error:', err.message);
      return null;
    }
  }
  return null;
}

async function searchFlights(params: {
  origin: string;
  destination: string;
  date: string;
  returnDate?: string;
  adults?: number;
  cabinClass?: string;
  currency?: string;
}): Promise<any[]> {
  const originEntity = await autoSuggest(params.origin);
  const destEntity = await autoSuggest(params.destination);

  if (!originEntity || !destEntity) {
    return [{
      error: true,
      message: `Could not resolve airports: ${!originEntity ? params.origin : ''} ${!destEntity ? params.destination : ''}`.trim(),
    }];
  }

  const { data } = await axios.get(
    `https://${RAPIDAPI_HOST}/api/v2/flights/searchFlightsWebComplete`,
    {
      headers,
      timeout: 20000,
      params: {
        originSkyId: originEntity.skyId,
        destinationSkyId: destEntity.skyId,
        originEntityId: originEntity.entityId,
        destinationEntityId: destEntity.entityId,
        date: params.date,
        ...(params.returnDate && { returnDate: params.returnDate }),
        cabinClass: params.cabinClass || 'economy',
        adults: params.adults || 1,
        currency: params.currency || 'USD',
        market: 'en-US',
        countryCode: 'US',
      },
    }
  );

  const itineraries = data?.data?.itineraries ?? [];
  return itineraries.slice(0, 15).map((it: any) => {
    const leg = it.legs?.[0];
    return {
      id: it.id,
      price: it.price?.formatted ?? it.price?.raw,
      priceRaw: it.price?.raw,
      airline: leg?.carriers?.marketing?.[0]?.name ?? 'Unknown',
      airlineLogo: leg?.carriers?.marketing?.[0]?.logoUrl,
      origin: leg?.origin?.displayCode,
      destination: leg?.destination?.displayCode,
      departure: leg?.departure,
      arrival: leg?.arrival,
      duration: leg?.durationInMinutes,
      stops: leg?.stopCount ?? 0,
      cabinClass: params.cabinClass || 'economy',
      score: it.score,
    };
  });
}

/**
 * Resolve a destination query to a hotel-specific entityId.
 * Uses the hotel destination endpoint instead of the flight airport endpoint,
 * so "Paris" resolves to the city (not CDG airport).
 */
async function hotelAutoSuggest(query: string): Promise<string | null> {
  const hotelPaths = [
    '/api/v1/hotels/searchDestinationOrHotel',
    '/api/v1/hotels/searchDestination',
  ];

  for (const path of hotelPaths) {
    try {
      const { data } = await axios.get(
        `https://${RAPIDAPI_HOST}${path}`,
        { headers, params: { query, locale: 'en-US' }, timeout: 10000 }
      );
      const places = data?.data;
      if (Array.isArray(places) && places.length > 0) {
        // Prefer city-level entity over hotel-level
        const city = places.find((p: any) =>
          p.type === 'PLACE_TYPE_CITY' || p.type === 'city' || p.hierarchy?.includes('City')
        );
        const chosen = city || places[0];
        const entityId = chosen.entityId || chosen.destId || chosen.gaiaId;
        if (entityId) {
          console.log(`🏨 hotelAutoSuggest: "${query}" → entityId=${entityId} (${chosen.name || chosen.presentation?.title || query})`);
          return entityId;
        }
      }
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 403) continue;
      console.error(`hotelAutoSuggest error on ${path}:`, err.message);
    }
  }

  // Fallback: use flight autoSuggest (better than nothing)
  console.warn(`🏨 hotelAutoSuggest: hotel endpoints failed for "${query}", falling back to flight autoSuggest`);
  const entity = await autoSuggest(query);
  return entity?.entityId ?? null;
}

async function searchHotels(params: {
  destination: string;
  checkin: string;
  checkout: string;
  adults?: number;
  currency?: string;
}): Promise<any[]> {
  // Resolve destination using hotel-specific endpoint (not flight airports)
  const entityId = await hotelAutoSuggest(params.destination);
  if (!entityId) {
    return [{
      error: true,
      message: `Could not resolve destination: ${params.destination}`,
    }];
  }

  const { data } = await axios.get(
    `https://${RAPIDAPI_HOST}/api/v1/hotels/searchHotels`,
    {
      headers,
      timeout: 20000,
      params: {
        entityId,
        checkin: params.checkin,
        checkout: params.checkout,
        adults: params.adults || 1,
        currency: params.currency || 'USD',
        market: 'en-US',
        countryCode: 'US',
      },
    }
  );

  const hotels = data?.data?.hotels ?? [];
  return hotels.slice(0, 15).map((h: any) => {
    // Price can be a string ("$150"), number, or object ({ amount: 150, ... })
    let priceRaw: number | undefined;
    if (typeof h.price === 'number') {
      priceRaw = h.price;
    } else if (typeof h.price === 'string') {
      priceRaw = parseFloat(h.price.replace(/[^0-9.]/g, '')) || undefined;
    } else if (h.price?.amount != null) {
      priceRaw = h.price.amount;
    } else if (h.price?.raw != null) {
      priceRaw = h.price.raw;
    } else if (h.rawPrice != null) {
      priceRaw = h.rawPrice;
    }

    return {
      id: h.hotelId || h.id,
      name: h.name || h.hotelName || 'Hotel',
      price: h.price?.formatted ?? h.price,
      priceRaw,
      rating: h.stars ?? h.rating ?? h.starRating,
      reviewScore: h.reviewScore ?? h.reviewsSummary?.score,
      location: h.distance ?? h.location ?? h.address,
      imageUrl: h.heroImage ?? h.images?.[0]?.url ?? h.images?.[0],
      destination: params.destination,
      checkin: params.checkin,
      checkout: params.checkout,
    };
  });
}

// ── MCP Server ────────────────────────────────────────────────────────

const server = new Server(
  { name: 'rapidapi-travel', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_flights',
      description:
        'Search for flights between two cities/airports. Returns prices, airlines, duration and stop information.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          origin: { type: 'string', description: 'Origin city or IATA airport code (e.g. "New York", "JFK")' },
          destination: { type: 'string', description: 'Destination city or IATA airport code (e.g. "London", "LHR")' },
          date: { type: 'string', description: 'Departure date in YYYY-MM-DD format' },
          returnDate: { type: 'string', description: 'Return date in YYYY-MM-DD format (optional, for round-trip)' },
          adults: { type: 'number', description: 'Number of adult passengers (default 1)' },
          cabinClass: { type: 'string', description: 'Cabin class: economy, premium_economy, business, first (default economy)' },
          currency: { type: 'string', description: 'Currency code (default USD)' },
        },
        required: ['origin', 'destination', 'date'],
      },
    },
    {
      name: 'search_hotels',
      description:
        'Search for hotels in a destination city. Returns hotel names, prices, ratings and locations.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          destination: { type: 'string', description: 'City or area to search for hotels (e.g. "Paris", "Tokyo")' },
          checkin: { type: 'string', description: 'Check-in date in YYYY-MM-DD format' },
          checkout: { type: 'string', description: 'Check-out date in YYYY-MM-DD format' },
          adults: { type: 'number', description: 'Number of adult guests (default 1)' },
          currency: { type: 'string', description: 'Currency code (default USD)' },
        },
        required: ['destination', 'checkin', 'checkout'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'search_flights') {
      const results = await searchFlights(args as any);
      return {
        content: [{ type: 'text', text: JSON.stringify({ flights: results }) }],
      };
    }

    if (name === 'search_hotels') {
      const results = await searchHotels(args as any);
      return {
        content: [{ type: 'text', text: JSON.stringify({ hotels: results }) }],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
      isError: true,
    };
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
      isError: true,
    };
  }
});

// ── Start ─────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('RapidAPI Travel MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
