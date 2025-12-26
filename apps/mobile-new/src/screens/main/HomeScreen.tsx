import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Welcome to Agentic Commerce
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Your AI-powered shopping assistant
        </Text>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge">Discover Products</Text>
            <Text variant="bodyMedium" style={styles.cardText}>
              Search for products using text or images
            </Text>
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('Agent' as never)}
              style={styles.button}
            >
              Start Shopping
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge">AI Agent</Text>
            <Text variant="bodyMedium" style={styles.cardText}>
              Chat with our AI assistant to find the perfect products
            </Text>
            <Button 
              mode="outlined" 
              onPress={() => navigation.navigate('Agent' as never)}
              style={styles.button}
            >
              Open Agent
            </Button>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    marginBottom: 24,
    color: '#666',
  },
  card: {
    marginBottom: 16,
  },
  cardText: {
    marginVertical: 8,
    color: '#666',
  },
  button: {
    marginTop: 8,
  },
});

export default HomeScreen;

