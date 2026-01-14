# Search Enhancement Requirements

## Current Status

The current search implementation uses:
- Google Custom Search API (online products)
- AI-powered filtering and extraction
- Basic product information (name, price, description, URL)

## Requested Enhancement

Search should look for:
1. **Online products** (current functionality)
2. **In-store products** (NEW - requires location-based APIs)
3. **Price information** (currently available)
4. **Distance from user's current location** (NEW - requires location services)

## Required Changes

### Frontend (Mobile App)

1. **Location Services:**
   - Add `expo-location` or `@react-native-community/geolocation`
   - Request location permissions
   - Get user's current coordinates (latitude, longitude)

2. **Search Interface:**
   - Add location toggle/option
   - Display distance information in product results
   - Show store locations on map
   - Filter by distance (e.g., "within 5 miles")

3. **Product Display:**
   - Show distance for in-store products
   - Display store location/address
   - Show "Online" vs "In-Store" labels
   - Allow filtering by availability type

### Backend (API)

1. **Location-Based Search Services:**
   - Google Places API (for store locations)
   - Google Maps Distance Matrix API (for distance calculation)
   - Store inventory APIs (if available)
   - Or use store-specific APIs (Walmart, Target, Best Buy, etc.)

2. **Database Schema:**
   - Add location fields to products table:
     - `store_location` (JSONB with lat/lng/address)
     - `availability_type` (online/in-store/both)
     - `distance` (calculated, not stored)

3. **Search Service Updates:**
   - Accept user location coordinates
   - Search both online and local stores
   - Calculate distances
   - Merge and rank results (by distance, price, availability)

4. **New API Endpoints:**
   - POST `/products/nlp-search` (enhance existing)
     - Add `location` parameter (lat/lng)
     - Add `searchRadius` parameter (miles/km)
     - Add `availabilityType` parameter (online/in-store/both)

### APIs Needed

1. **Google Places API:**
   - Find nearby stores
   - Get store information
   - Search for products in stores

2. **Google Maps Distance Matrix API:**
   - Calculate distances
   - Travel time estimates

3. **Store-Specific APIs (Optional):**
   - Walmart API
   - Target API
   - Best Buy API
   - etc.

### Implementation Steps

1. **Phase 1: Location Services** (Frontend)
   - Add location permission requests
   - Get user coordinates
   - Pass location to search API

2. **Phase 2: Backend Location Support** (Backend)
   - Accept location in search requests
   - Add location fields to database
   - Update search service to handle location

3. **Phase 3: In-Store Search** (Backend)
   - Integrate Google Places API
   - Search nearby stores
   - Get product availability

4. **Phase 4: Distance Calculation** (Backend)
   - Use Distance Matrix API
   - Calculate and sort by distance
   - Return distance in results

5. **Phase 5: UI Updates** (Frontend)
   - Display distance information
   - Show store locations
   - Filter by distance/availability

## Estimated Complexity

- **Location Services:** Medium
- **Backend Location Support:** Medium
- **In-Store Search Integration:** High (requires external APIs, rate limits, cost)
- **Distance Calculation:** Medium
- **UI Updates:** Medium

**Total:** Major feature - 2-4 weeks development time

## Cost Considerations

- Google Places API: ~$17 per 1000 requests
- Google Maps Distance Matrix API: ~$5 per 1000 requests
- Store-specific APIs: Varies (may require partnerships)

## Alternative Approach (Simpler)

If full in-store search is too complex initially, consider:
1. Keep current online-only search
2. Add "Find in Store" link to product details (opens Google Maps with store search)
3. Show estimated distance to nearest store (using store name/location data)

This provides location awareness without full in-store inventory integration.

