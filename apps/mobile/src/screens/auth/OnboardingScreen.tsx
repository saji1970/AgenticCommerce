import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type OnboardingNavigationProp = StackNavigationProp<AuthStackParamList, 'Onboarding'>;

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<OnboardingNavigationProp>();

  return (
    <View style={styles.container}>
      <Text variant="displaySmall" style={styles.title}>
        Agentic Commerce
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Your AI shopping assistant for smart, autonomous purchases
      </Text>
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Login')}
          style={styles.button}
        >
          Login
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Register')}
          style={styles.button}
        >
          Create Account
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 40,
    textAlign: 'center',
    opacity: 0.7,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    marginVertical: 8,
  },
});

export default OnboardingScreen;
