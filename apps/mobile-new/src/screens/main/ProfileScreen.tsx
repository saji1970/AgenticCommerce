import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';

const ProfileScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    await authService.logout();
    dispatch(logout());
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              Profile
            </Text>
            {user ? (
              <>
                <Text variant="bodyLarge" style={styles.info}>
                  {user.firstName} {user.lastName}
                </Text>
                <Text variant="bodyMedium" style={styles.info}>
                  {user.email}
                </Text>
              </>
            ) : (
              <Text variant="bodyMedium" style={styles.info}>
                Not logged in
              </Text>
            )}
          </Card.Content>
        </Card>

        <Divider style={styles.divider} />

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Settings
            </Text>
            <Button mode="outlined" onPress={() => {}} style={styles.button}>
              Preferences
            </Button>
            <Button mode="outlined" onPress={() => {}} style={styles.button}>
              Payment Methods
            </Button>
            <Button mode="outlined" onPress={() => {}} style={styles.button}>
              Notifications
            </Button>
          </Card.Content>
        </Card>

        {user && (
          <>
            <Divider style={styles.divider} />
            <Button 
              mode="contained" 
              onPress={handleLogout}
              buttonColor="#B00020"
              style={styles.logoutButton}
            >
              Logout
            </Button>
          </>
        )}
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
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  info: {
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  button: {
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  logoutButton: {
    marginTop: 8,
  },
});

export default ProfileScreen;

