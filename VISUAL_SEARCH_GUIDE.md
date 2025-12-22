# Visual Search Feature Guide

## Overview

The Visual Search feature allows users to:
1. **Take a photo** of any product with their phone camera
2. **Upload an image** from their gallery
3. **Get AI-powered analysis** of the product
4. **Search across stores** for the same or similar products
5. **Filter and sort results** by price, distance, availability, and reviews
6. **Leave reviews** for products and stores

## Features

### 📷 Camera Integration
- Real-time camera access
- Take photos directly in-app
- Upload from photo gallery
- Image preview before search

### 🤖 AI Image Analysis
- Object detection (what's in the image)
- Color extraction (dominant colors)
- Label generation (product categories)
- Suggested search query generation

### 🔍 Smart Product Search
- Search by visual similarity
- Multi-retailer results
- Location-aware searches
- Price comparison

### 📍 Geolocation Features
- Find nearby stores with the product
- Calculate distance to stores
- In-store vs online availability
- Store hours and contact info

### 🎯 Advanced Filtering
- **Sort by:**
  - Price (low to high / high to low)
  - Distance (nearest first)
  - Rating (highest rated)
  - Relevance (best match)

- **Filter by:**
  - Price range
  - Availability (online / in-store / nearby)
  - Star rating (minimum)
  - Specific stores/retailers
  - Category

### ⭐ Review System
- **Product Reviews:**
  - 5-star ratings
  - Written reviews with titles
  - Photo attachments
  - Verified purchase badges
  - Helpful votes

- **Store Reviews:**
  - Overall rating
  - Aspect ratings (service, cleanliness, availability, pricing)
  - Location-specific reviews
  - Verified customer badges

## Visual Search Providers

### Option 1: Clarifai (Recommended for MVP)
**Cost:** FREE tier - 1,000 operations/month
**Accuracy:** Excellent for general products
**Setup Time:** 5 minutes

```bash
# Get API key from clarifai.com
VISUAL_SEARCH_PROVIDER=clarifai
CLARIFAI_API_KEY=your_api_key
```

**Signup:** https://clarifai.com/

### Option 2: Google Cloud Vision AI
**Cost:** FREE tier - 1,000 units/month
**Accuracy:** Best-in-class
**Setup Time:** 15 minutes (requires GCP setup)

```bash
# Requires Google Cloud credentials
VISUAL_SEARCH_PROVIDER=google-vision
GOOGLE_VISION_API_KEY=your_credentials_json
```

**Setup:** https://cloud.google.com/vision/docs

## Setup Instructions

### 1. Backend Setup

**Install visual search package:**
```bash
cd packages/visual-search
npm install
npm run build
```

**Add environment variables:**
```bash
# .env
VISUAL_SEARCH_PROVIDER=clarifai
CLARIFAI_API_KEY=your_clarifai_api_key
```

**Run database migrations:**
```bash
psql $DATABASE_URL < apps/backend/src/database/schema.sql
```

### 2. Mobile App Setup

**Install dependencies:**
```bash
cd apps/mobile
npm install expo-camera expo-image-picker expo-location
```

**Update app.json permissions:**
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "We need camera access for visual product search",
        "NSPhotoLibraryUsageDescription": "We need photo library access to search by image",
        "NSLocationWhenInUseUsageDescription": "We need location to find nearby stores"
      }
    },
    "android": {
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

### 3. Test the Feature

**Test visual search API:**
```bash
curl -X POST http://localhost:3000/api/v1/products/visual-search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image": "BASE64_IMAGE_DATA"}'
```

**Expected response:**
```json
{
  "success": true,
  "analysis": {
    "labels": ["Laptop", "Electronics", "Computer"],
    "dominantColors": ["#000000", "#C0C0C0"],
    "suggestedQuery": "Laptop Electronics Computer",
    "detectedObjects": [
      {
        "name": "Laptop",
        "confidence": 0.95
      }
    ],
    "confidence": 0.92
  }
}
```

## Usage Flow

### User Journey

1. **User opens app** → Taps "Visual Search" tab
2. **Camera opens** → User takes photo of product
3. **AI analyzes image** → Detects "Nike Running Shoes"
4. **Search begins** → Queries multiple retailers
5. **Results appear** → Sorted by relevance
6. **User filters** → "Show only nearby stores"
7. **Results update** → Shows 3 stores within 5km
8. **User selects product** → Views details
9. **User reads reviews** → Checks ratings
10. **User purchases** → Or adds review

## API Endpoints

### Visual Search Endpoints

```
POST /api/v1/products/visual-search
POST /api/v1/products/search-by-image
GET  /api/v1/products/:id/similar
GET  /api/v1/products/:id/nearby-stores
```

### Review Endpoints

```
POST /api/v1/reviews/product
GET  /api/v1/reviews/product/:productId
POST /api/v1/reviews/retailer
GET  /api/v1/reviews/retailer/:retailerId
GET  /api/v1/reviews/store/:storeLocationId
POST /api/v1/reviews/:reviewId/helpful
```

### Enhanced Search Endpoints

```
POST /api/v1/products/search
GET  /api/v1/products/:id
GET  /api/v1/products/:id/price-history
```

## Database Schema

### Key Tables

**products** - Product catalog
**store_locations** - Physical store locations with GPS coordinates
**product_availability** - Stock levels per location
**product_reviews** - User product reviews
**retailer_reviews** - User store reviews
**price_history** - Historical pricing data

### Spatial Queries

The database includes a `calculate_distance()` function for geospatial queries:

```sql
SELECT *,
  calculate_distance(
    37.7749, -122.4194,  -- User location (SF)
    latitude, longitude   -- Store location
  ) as distance
FROM store_locations
WHERE calculate_distance(
  37.7749, -122.4194,
  latitude, longitude
) <= 10  -- Within 10km
ORDER BY distance ASC;
```

## Mobile App Components

### Screens

- `VisualSearchScreen.tsx` - Camera and image upload
- `SearchResultsScreen.tsx` - Results with filters
- `ProductDetailsScreen.tsx` - Product information
- `ReviewScreen.tsx` - Write reviews
- `StoreLocationScreen.tsx` - Store details

### Services

- `visualSearchService.ts` - Image analysis API
- `productService.ts` - Product search and filtering
- `reviewService.ts` - Reviews API
- `locationService.ts` - Geolocation utilities

## Cost Breakdown

### Visual Search Costs

| Provider | Free Tier | Paid Pricing |
|----------|-----------|--------------|
| **Clarifai** | 1,000/month | $1.20 per 1,000 |
| **Google Vision** | 1,000/month | $1.50 per 1,000 |

### Example Costs (10,000 users)

**Assumptions:**
- 20% users use visual search monthly
- Average 3 searches per user
- 2,000 × 3 = 6,000 searches/month

**Clarifai:** FREE (under 1,000) or $7.20/month
**Google Vision:** FREE (under 1,000) or $9/month

**Recommendation:** Start with Clarifai free tier

## Advanced Features

### Future Enhancements

1. **Visual Similarity Search**
   - Find products that look similar
   - Color-based matching
   - Style recognition

2. **AR Product Placement**
   - See product in your space (using phone camera)
   - Size comparison
   - Room matching

3. **Batch Image Search**
   - Upload multiple images
   - Create shopping lists from photos
   - Scan receipts for repurchase

4. **Smart Notifications**
   - Price drop alerts for saved images
   - Back-in-stock notifications
   - Similar product recommendations

5. **Social Features**
   - Share product finds
   - Collaborative shopping lists
   - Friend recommendations

## Troubleshooting

### Common Issues

**1. Camera not working**
- Check permissions in phone settings
- Verify app.json has correct permissions
- Restart app after granting permissions

**2. Image analysis fails**
- Check API key is valid
- Verify image is under 4MB
- Ensure image is in supported format (JPG, PNG)

**3. No nearby results**
- Check location permissions
- Verify GPS is enabled
- Increase search radius

**4. Reviews not saving**
- Check user is authenticated
- Verify product ID exists
- Check database connection

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run backend
```

## Best Practices

### For Users

1. Take clear, well-lit photos
2. Center the product in frame
3. Avoid reflections and glare
4. Use plain backgrounds when possible

### For Developers

1. Implement image compression before upload
2. Cache visual search results
3. Rate limit visual search API calls
4. Optimize database queries with proper indexes
5. Use CDN for product images

## Performance Optimization

### Image Optimization

```typescript
// Compress image before upload
const compressImage = async (uri: string) => {
  const manipulatedImage = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.7, format: SaveFormat.JPEG }
  );
  return manipulatedImage;
};
```

### Caching Strategy

- Cache visual search results for 1 hour
- Cache product details for 15 minutes
- Cache store locations for 24 hours
- Cache reviews for 5 minutes

## Security Considerations

1. **Rate Limiting**
   - Max 10 visual searches per hour per user
   - Max 100 reviews per day per user

2. **Image Validation**
   - Check file size (max 4MB)
   - Validate image format
   - Scan for inappropriate content

3. **Location Privacy**
   - Only use location when needed
   - Don't store precise GPS coordinates
   - Allow users to disable location

4. **Review Moderation**
   - Flag inappropriate reviews
   - Verify purchase before review
   - Limit review edits

## Analytics & Metrics

### Track These KPIs

- Visual search usage rate
- Image-to-purchase conversion
- Average time to first result
- Search result relevance score
- Review submission rate
- Average rating per store
- Geolocation accuracy
- API response times

## Support

For issues or questions:
- Check troubleshooting section above
- Review API documentation
- Check database logs
- Contact support team

---

**Built with:**
- Expo Camera
- Clarifai / Google Vision AI
- PostgreSQL with PostGIS
- React Native Paper

Happy visual searching! 📸🛍️
