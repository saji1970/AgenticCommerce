import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { UserProfile } from '@agentic-commerce/shared-types';
import { ProfileStackParamList } from '../../types/navigation';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/user.service';
import { Button } from '../../components/common/Button';
import { useNavigation } from '@react-navigation/native';

export const ProfileScreen = () => {
  const { logout } = useAuth();
  const navigation = useNavigation<StackNavigationProp<ProfileStackParamList, 'ProfileMain'>>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await userService.getProfile();
      setProfile(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.profileCard}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>
          {profile?.firstName} {profile?.lastName}
        </Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{profile?.email}</Text>

        {profile?.phoneNumber && (
          <>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{profile.phoneNumber}</Text>
          </>
        )}
      </View>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('PaymentMethods')}
      >
        <Text style={styles.menuItemText}>Payment Methods</Text>
        <Text style={styles.menuItemSubtext}>Manage saved cards and wallets</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('PaymentMandates')}
      >
        <Text style={styles.menuItemText}>Checkout Payment Mandate (VRP)</Text>
        <Text style={styles.menuItemSubtext}>Authorize AI agents for variable recurring payments</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('MandateManagement')}
      >
        <Text style={styles.menuItemText}>Manage Agent Mandates</Text>
        <Text style={styles.menuItemSubtext}>Configure AI agent payment permissions</Text>
      </TouchableOpacity>

      <Button title="Logout" onPress={handleLogout} variant="secondary" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginTop: 16,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  menuItemSubtext: {
    fontSize: 12,
    color: '#666',
  },
});
