import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Linking,
} from 'react-native';
import { Product } from '@agentic-commerce/shared-types';
import { colors } from '../../theme/colors';

export type ProductDisplayType = 'flight' | 'physical' | 'service' | 'hotel';

function detectProductType(product: Product, productTypeHint?: string): ProductDisplayType {
  if (productTypeHint) {
    const hint = productTypeHint.toLowerCase();
    if (hint.includes('flight')) return 'flight';
    if (hint.includes('hotel')) return 'hotel';
    if (hint.includes('service') || hint.includes('rental')) return 'service';
  }
  const source = (product.source || '').toLowerCase();
  if (source.includes('serpapi_flights') || source.includes('rapidapi_flights')) return 'flight';
  const name = (product.name || '').toLowerCase();
  if (name.includes(' - ') && (name.includes(' to ') || name.includes('→'))) return 'flight';
  if (product.rawData?.flights || product.rawData?.total_duration != null) return 'flight';
  // Hotel detection: MCP source, rawData indicators, specifications, or name keywords
  if (source.includes('rapidapi-travel') && (product.rawData?.checkin || product.rawData?.rating != null)) return 'hotel';
  if (product.rawData?.specifications?.type === 'hotel') return 'hotel';
  if (product.rawData?.checkin && product.rawData?.checkout) return 'hotel';
  if (name.includes('hotel') || name.includes('resort') || name.includes('inn') || name.includes('suites')) return 'hotel';
  return 'physical';
}

interface UniversalProductCardProps {
  product: Product;
  onPress: () => void;
  compact?: boolean;
  productTypeHint?: string;
  isBestValue?: boolean;
  index?: number;
}

export const UniversalProductCard: React.FC<UniversalProductCardProps> = ({
  product,
  onPress,
  compact,
  productTypeHint,
  isBestValue = false,
  index = 0,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const displayType = detectProductType(product, productTypeHint);
  const priceStr =
    product.price != null && product.price > 0
      ? `${product.currency || 'USD'} $${product.price.toFixed(2)}`
      : null;

  const handleQuickAction = () => {
    if (displayType === 'flight') {
      if (product.productUrl) Linking.openURL(product.productUrl);
    } else {
      onPress();
    }
  };

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ translateY: slideAnim }],
  };

  if (displayType === 'flight') {
    const raw = product.rawData || {};
    const legs = raw.flights || [];
    const firstLeg = legs[0] || {};
    const lastLeg = legs[legs.length - 1] || firstLeg;
    const airline = firstLeg.airline || product.source?.split(':')[1] || 'Flight';
    const departTime = firstLeg.departure_airport?.time || '';
    const arriveTime = lastLeg.arrival_airport?.time || '';
    const duration = raw.total_duration
      ? `${Math.floor(raw.total_duration / 60)}h ${raw.total_duration % 60}m`
      : '';
    const stops = legs.length - 1;
    const stopText = stops === 0 ? 'Nonstop' : `${stops} stop${stops > 1 ? 's' : ''}`;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.card, compact && styles.cardCompact]}
      >
        <Animated.View style={animatedStyle}>
        <View style={styles.flightHeader}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.airlineLogo} resizeMode="contain" />
          ) : (
            <View style={styles.airlinePlaceholder}>
              <Text style={styles.airlinePlaceholderText}>{airline.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.airlineName}>{airline}</Text>
          {isBestValue && (
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>Best Value</Text>
            </View>
          )}
        </View>

        <View style={styles.timeline}>
          <View style={styles.timelinePoint}>
            <Text style={styles.timelineTime}>{departTime || '—'}</Text>
            <Text style={styles.timelineLabel} numberOfLines={1}>
              {firstLeg.departure_airport?.name || product.name?.split(' - ')[1]?.split(' to ')[0] || 'Depart'}
            </Text>
          </View>
          <View style={styles.timelineLine}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineDash} />
            <View style={styles.timelineDot} />
          </View>
          <View style={[styles.timelinePoint, styles.timelinePointEnd]}>
            <Text style={styles.timelineTime}>{arriveTime || '—'}</Text>
            <Text style={styles.timelineLabel} numberOfLines={1}>
              {lastLeg.arrival_airport?.name || product.name?.split(' to ')[1] || product.name?.split('→')[1] || 'Arrive'}
            </Text>
          </View>
        </View>

        <View style={styles.flightMeta}>
          <Text style={styles.metaText}>{stopText}</Text>
          {duration ? <Text style={styles.metaText}> · {duration}</Text> : null}
        </View>

        <View style={styles.flightFooter}>
          <Text style={styles.priceBold}>{priceStr || 'View price'}</Text>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={(e) => {
              e?.stopPropagation?.();
              handleQuickAction();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.trackButtonText}>Track Flight</Text>
          </TouchableOpacity>
        </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  if (displayType === 'hotel') {
    const raw = product.rawData || {};
    const hotelName = product.name || 'Hotel';
    const starRating = raw.rating ?? raw.stars ?? raw.starRating;
    const reviewScore = raw.reviewScore ?? raw.review_score;
    const location = raw.location ?? raw.distance ?? raw.address;
    const checkin = raw.checkin;
    const checkout = raw.checkout;
    const starsDisplay = starRating ? '★'.repeat(Math.min(Math.round(Number(starRating)), 5)) : null;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.card, compact && styles.cardCompact]}
      >
        <Animated.View style={animatedStyle}>
        {/* Hotel image */}
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.hotelImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.hotelImagePlaceholder}>
            <Text style={styles.hotelImagePlaceholderText}>🏨</Text>
          </View>
        )}

        {isBestValue && (
          <View style={[styles.bestValueBadge, styles.bestValueBadgeTopRight]}>
            <Text style={styles.bestValueText}>Best Value</Text>
          </View>
        )}

        {/* Hotel info */}
        <View style={styles.hotelInfo}>
          <Text style={styles.hotelName} numberOfLines={2}>{hotelName}</Text>

          <View style={styles.hotelRatingRow}>
            {starsDisplay && (
              <Text style={styles.hotelStars}>{starsDisplay}</Text>
            )}
            {reviewScore != null && (
              <View style={styles.hotelScoreBadge}>
                <Text style={styles.hotelScoreText}>{Number(reviewScore).toFixed(1)}</Text>
              </View>
            )}
          </View>

          {location && (
            <Text style={styles.hotelLocation} numberOfLines={1}>
              📍 {typeof location === 'string' ? location : JSON.stringify(location)}
            </Text>
          )}

          {checkin && checkout && (
            <Text style={styles.hotelDates}>
              {checkin} → {checkout}
            </Text>
          )}
        </View>

        {/* Footer with price and action */}
        <View style={styles.hotelFooter}>
          <View>
            <Text style={styles.priceBold}>{priceStr || 'View price'}</Text>
            <Text style={styles.hotelPriceLabel}>per night</Text>
          </View>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={(e) => {
              e?.stopPropagation?.();
              onPress();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.trackButtonText}>Book Hotel</Text>
          </TouchableOpacity>
        </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  if (displayType === 'service') {
    const features = product.description
      ? product.description.split(/[•·\-]/).filter((s) => s.trim()).slice(0, 4)
      : [];

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.card, compact && styles.cardCompact]}
      >
        <Animated.View style={animatedStyle}>
        {isBestValue && (
          <View style={[styles.bestValueBadge, styles.bestValueBadgeTop]}>
            <Text style={styles.bestValueText}>Best Value</Text>
          </View>
        )}
        <View style={styles.serviceLayout}>
          {product.imageUrl && (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.serviceImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.serviceContent}>
            <Text style={styles.serviceTitle} numberOfLines={2}>
              {product.name}
            </Text>
            {features.length > 0 && (
              <View style={styles.featureList}>
                {features.map((f, i) => (
                  <Text key={i} style={styles.featureItem} numberOfLines={1}>
                    • {f.trim()}
                  </Text>
                ))}
              </View>
            )}
            <View style={styles.serviceFooter}>
              <Text style={styles.priceBadge}>{priceStr || 'View details'}</Text>
              <TouchableOpacity style={styles.addButton} onPress={onPress} activeOpacity={0.7}>
                <Text style={styles.addButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // Physical product - Product Spotlight
  const rating = product.rawData?.rating ?? product.rawData?.reviewCount;
  const reviewCount = product.rawData?.reviewCount ?? product.rawData?.review_count;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.card, compact && styles.cardCompact]}
    >
      <Animated.View style={animatedStyle}>
      <View style={styles.spotlightLayout}>
        <View style={styles.imageContainer}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.spotlightImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>?</Text>
            </View>
          )}
          {isBestValue && (
            <View style={[styles.bestValueBadge, styles.bestValueBadgeTopRight]}>
              <Text style={styles.bestValueText}>Best Value</Text>
            </View>
          )}
          <View style={styles.priceBadgeContainer}>
            <Text style={styles.priceBadge}>{priceStr || 'Price N/A'}</Text>
          </View>
        </View>
        <View style={styles.spotlightContent}>
          {rating != null && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStars}>★ {Number(rating).toFixed(1)}</Text>
              {reviewCount != null && (
                <Text style={styles.reviewCount}>({reviewCount} reviews)</Text>
              )}
            </View>
          )}
          <Text style={styles.spotlightTitle} numberOfLines={2}>
            {product.name}
          </Text>
          {product.description && (
            <Text style={styles.spotlightDesc} numberOfLines={2}>
              {product.description}
            </Text>
          )}
          <View style={styles.spotlightActions}>
            <TouchableOpacity style={styles.viewDetailsButton} onPress={onPress} activeOpacity={0.7}>
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addToCartButton} onPress={onPress} activeOpacity={0.7}>
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardCompact: {
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 12,
  },
  // Flight
  flightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  airlineLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 10,
  },
  airlinePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.actionMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  airlinePlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.action,
  },
  airlineName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelinePoint: {
    flex: 1,
  },
  timelinePointEnd: {
    alignItems: 'flex-end',
  },
  timelineTime: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timelineLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timelineLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.action,
  },
  timelineDash: {
    width: 24,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  flightMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  flightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  priceBold: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.action,
  },
  trackButton: {
    backgroundColor: colors.action,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Badges
  bestValueBadge: {
    backgroundColor: colors.bestValue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bestValueBadgeTop: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bestValueBadgeTopRight: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  // Hotel
  hotelImage: {
    width: '100%' as any,
    height: 140,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    marginBottom: 12,
  },
  hotelImagePlaceholder: {
    width: '100%' as any,
    height: 140,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  hotelImagePlaceholderText: {
    fontSize: 36,
  },
  hotelInfo: {
    marginBottom: 12,
  },
  hotelName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  hotelRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  hotelStars: {
    fontSize: 14,
    color: '#F59E0B',
  },
  hotelScoreBadge: {
    backgroundColor: colors.action,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hotelScoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  hotelLocation: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  hotelDates: {
    fontSize: 12,
    color: colors.textMuted,
  },
  hotelFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  hotelPriceLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Service
  serviceLayout: {
    flexDirection: 'row',
  },
  serviceImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    marginRight: 12,
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  featureList: {
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: colors.action,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  // Physical product
  spotlightLayout: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 120,
    marginRight: 16,
  },
  spotlightImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    color: colors.textMuted,
  },
  priceBadgeContainer: {
    marginTop: 8,
  },
  priceBadge: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.action,
  },
  spotlightContent: {
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingStars: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 4,
  },
  spotlightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  spotlightDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  spotlightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewDetailsButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.action,
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.action,
  },
  addToCartButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.action,
    alignItems: 'center',
  },
  addToCartText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
