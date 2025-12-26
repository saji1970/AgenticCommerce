import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, ScrollView, PermissionsAndroid, Platform } from 'react-native';
import { Text, Card, Chip, Button, Searchbar, SegmentedButtons, Menu } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import { productService } from '../../services/productService';

type SortOption = 'price-low' | 'price-high' | 'distance' | 'rating' | 'relevance';
type AvailabilityFilter = 'all' | 'online' | 'instore' | 'nearby';

const SearchResultsScreen: React.FC = () => {
  const route = useRoute();
  const { query, visualSearch } = route.params as any;

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ coords: { latitude: number; longitude: number } } | null>(null);

  // Filters and sorting
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [storeFilter, setStoreFilter] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);

  // UI State
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);

  const isMountedRef = React.useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const initialize = async () => {
      await getLocation();
      if (isMountedRef.current) {
        await searchProducts();
      }
    };

    initialize();

    return () => {
      isMountedRef.current = false;
    };
  }, [query]);

  useEffect(() => {
    applySortAndFilter();
  }, [sortBy, availability, priceRange, minRating, storeFilter]);

  const getLocation = async () => {
    if (!isMountedRef.current) return;
    
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return;
        }
      }
      
      Geolocation.getCurrentPosition(
        (position) => {
          if (isMountedRef.current) {
            setLocation({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              },
            });
          }
        },
        (error) => {
          console.error('Location error:', error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Location error:', error);
      // Continue without location
    }
  };

  const searchProducts = async () => {
    if (!isMountedRef.current) return;
    
    try {
      setLoading(true);
      const results = await productService.searchProducts({
        query,
        latitude: location?.coords.latitude,
        longitude: location?.coords.longitude,
      });
      
      if (isMountedRef.current) {
        setProducts(results);
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Search error:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const applySortAndFilter = () => {
    let filtered = [...products];

    // Apply availability filter
    if (availability !== 'all') {
      filtered = filtered.filter((p) => {
        if (availability === 'nearby') {
          return p.distance && p.distance < 10; // 10 km radius
        }
        return p.availabilityType === availability;
      });
    }

    // Apply price range filter
    filtered = filtered.filter(
      (p) => p.price >= priceRange.min && p.price <= priceRange.max
    );

    // Apply rating filter
    if (minRating > 0) {
      filtered = filtered.filter((p) => p.rating >= minRating);
    }

    // Apply store filter
    if (storeFilter.length > 0) {
      filtered = filtered.filter((p) => storeFilter.includes(p.retailer.id));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'distance':
          return (a.distance || 999) - (b.distance || 999);
        case 'rating':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

    setProducts(filtered);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const renderProduct = ({ item }: { item: any }) => (
    <Card style={styles.productCard}>
      <Card.Cover source={{ uri: item.imageUrls[0] }} />
      <Card.Content>
        <Text variant="titleMedium">{item.name}</Text>
        <Text variant="headlineSmall" style={styles.price}>
          ${item.price.toFixed(2)}
        </Text>

        <View style={styles.infoRow}>
          <Chip icon="store">{item.retailer.name}</Chip>
          <Chip icon="star">{item.rating.toFixed(1)}</Chip>
          {item.distance && <Chip icon="map-marker">{item.distance.toFixed(1)} km</Chip>}
        </View>

        <View style={styles.availabilityRow}>
          {item.availability.inStore && (
            <Chip mode="outlined" icon="store-check">
              In Store
            </Chip>
          )}
          {item.availability.online && (
            <Chip mode="outlined" icon="cart">
              Online
            </Chip>
          )}
        </View>

        <Text variant="bodySmall" style={styles.reviews}>
          {item.reviewCount} reviews
        </Text>
      </Card.Content>
      <Card.Actions>
        <Button onPress={() => {}}>Details</Button>
        <Button mode="contained" onPress={() => {}}>
          Buy Now
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      {visualSearch && (
        <Chip icon="camera" style={styles.visualSearchChip}>
          Visual Search: {query}
        </Chip>
      )}

      <View style={styles.controls}>
        <SegmentedButtons
          value={sortBy}
          onValueChange={(value) => setSortBy(value as SortOption)}
          buttons={[
            { value: 'relevance', label: 'Best Match' },
            { value: 'price-low', label: 'Price ↑' },
            { value: 'distance', label: 'Nearest' },
            { value: 'rating', label: 'Top Rated' },
          ]}
          style={styles.sortButtons}
        />

        <SegmentedButtons
          value={availability}
          onValueChange={(value) => setAvailability(value as AvailabilityFilter)}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'online', label: 'Online' },
            { value: 'instore', label: 'In-Store' },
            { value: 'nearby', label: 'Nearby' },
          ]}
          style={styles.availabilityButtons}
        />

        <Button icon="filter-variant" mode="outlined" onPress={() => setFilterMenuVisible(true)}>
          More Filters
        </Button>
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text>No products found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  visualSearchChip: {
    margin: 16,
  },
  controls: {
    padding: 16,
    gap: 12,
  },
  sortButtons: {
    marginBottom: 8,
  },
  availabilityButtons: {
    marginBottom: 8,
  },
  list: {
    padding: 16,
  },
  productCard: {
    marginBottom: 16,
  },
  price: {
    color: '#2E7D32',
    fontWeight: 'bold',
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
    flexWrap: 'wrap',
  },
  availabilityRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  reviews: {
    marginTop: 4,
    opacity: 0.7,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
});

export default SearchResultsScreen;
