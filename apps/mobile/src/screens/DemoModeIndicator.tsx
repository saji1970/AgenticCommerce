import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { isDemoMode } from '../config';

export const DemoModeIndicator: React.FC = () => {
  if (!isDemoMode()) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Chip icon="information" style={styles.chip} textStyle={styles.chipText}>
        Demo Mode - Using Mock Data
      </Chip>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 1,
    borderBottomColor: '#FFC107',
  },
  chip: {
    backgroundColor: '#FFC107',
    alignSelf: 'center',
  },
  chipText: {
    color: '#000',
    fontSize: 12,
  },
});

