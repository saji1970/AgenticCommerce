import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';

const HomeScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Discover Products
      </Text>
      <Card style={styles.card}>
        <Card.Cover source={{ uri: 'https://via.placeholder.com/400x200' }} />
        <Card.Title title="Featured Deals" subtitle="Best picks for you" />
        <Card.Content>
          <Text>Personalized product recommendations coming soon...</Text>
        </Card.Content>
        <Card.Actions>
          <Button>View All</Button>
        </Card.Actions>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
});

export default HomeScreen;
