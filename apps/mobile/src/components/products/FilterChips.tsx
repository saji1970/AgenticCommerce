import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ProductFilter } from '@agentic-commerce/shared-types';

interface FilterChipsProps {
  filters: ProductFilter[];
  selectedFilters: string[];
  onFilterToggle: (filterId: string) => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  selectedFilters,
  onFilterToggle,
}) => {
  if (filters.length === 0) {
    return null;
  }

  const isSelected = (filterId: string) => selectedFilters.includes(filterId);

  const formatFilterLabel = (filter: ProductFilter): string => {
    if (filter.filterType === 'price_range' && filter.filterValue) {
      const value = typeof filter.filterValue === 'string' ? JSON.parse(filter.filterValue) : filter.filterValue;
      if (value.min !== undefined && value.max !== undefined) {
        return `$${value.min}-$${value.max}`;
      } else if (value.min !== undefined) {
        return `$${value.min}+`;
      } else if (value.max !== undefined) {
        return `Under $${value.max}`;
      }
    }
    return filter.filterLabel;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => {
          const selected = isSelected(filter.id);
          return (
            <TouchableOpacity
              key={filter.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onFilterToggle(filter.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {formatFilterLabel(filter)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  chipTextSelected: {
    color: '#fff',
  },
});
