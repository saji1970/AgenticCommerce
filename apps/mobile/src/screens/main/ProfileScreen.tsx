import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Button, Divider, Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { logout } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import { RootState } from '../../store';

const ProfileScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    await authService.logout();
    dispatch(logout());
  };

  const handleLogin = () => {
    navigation.navigate('Login' as never);
  };

  const handleRegister = () => {
    navigation.navigate('Register' as never);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.authPrompt}>
        <Text variant="headlineMedium" style={styles.authTitle}>
          Sign In Required
        </Text>
        <Text variant="bodyLarge" style={styles.authSubtitle}>
          Create an account or sign in to manage your profile, payment methods, and view your orders.
        </Text>
        <Button mode="contained" onPress={handleLogin} style={styles.authButton}>
          Sign In
        </Button>
        <Button mode="outlined" onPress={handleRegister} style={styles.authButton}>
          Create Account
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader>Account</List.Subheader>
        <List.Item
          title={user?.email || 'User'}
          description="Email"
          left={(props) => <List.Icon {...props} icon="account" />}
        />
        <Divider />
        <List.Item
          title="Shopping Preferences"
          left={(props) => <List.Icon {...props} icon="cog" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="Payment Methods"
          left={(props) => <List.Icon {...props} icon="credit-card" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="Addresses"
          left={(props) => <List.Icon {...props} icon="map-marker" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
      </List.Section>
      <List.Section>
        <List.Subheader>Settings</List.Subheader>
        <List.Item
          title="Notifications"
          left={(props) => <List.Icon {...props} icon="bell" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="Privacy & Security"
          left={(props) => <List.Icon {...props} icon="shield-check" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
      </List.Section>
      <Button mode="contained" onPress={handleLogout} style={styles.logoutButton}>
        Logout
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  authSubtitle: {
    marginBottom: 32,
    textAlign: 'center',
    opacity: 0.7,
  },
  authButton: {
    width: '100%',
    marginVertical: 8,
  },
  logoutButton: {
    margin: 16,
  },
});

export default ProfileScreen;
