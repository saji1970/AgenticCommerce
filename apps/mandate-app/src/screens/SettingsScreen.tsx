import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useCAConfig, CertificateInfo } from '../contexts/CAConfigContext';
import { caServerService } from '../services/ca-server.service';
import { certificateManagerService } from '../services/certificate-manager.service';
import { generateTestCertificate, getTestServerPublicKey } from '../services/test-certificate-generator';

export const SettingsScreen: React.FC = () => {
  const {
    config,
    updateConfig,
    clearConfig,
    certificateInfo,
    setCertificateInfo,
    demoMode,
    setDemoMode,
    loading: configLoading,
  } = useCAConfig();

  // Form state
  const [serverUrl, setServerUrl] = useState(config.serverUrl);
  const [port, setPort] = useState(config.port || '443');
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);

  // UI state
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [fetchingCert, setFetchingCert] = useState(false);
  const [revokingCert, setRevokingCert] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sync form state with config
  useEffect(() => {
    setServerUrl(config.serverUrl);
    setPort(config.port || '443');
    setApiKey(config.apiKey);
  }, [config]);

  // Load certificate info on mount
  useEffect(() => {
    loadCertificateInfo();
  }, []);

  const loadCertificateInfo = async () => {
    try {
      const metadata = await certificateManagerService.getCertificateMetadata();
      if (metadata) {
        const certInfo: CertificateInfo = {
          fingerprint: metadata.fingerprint,
          issuer: metadata.issuer,
          subject: metadata.subject,
          notBefore: metadata.notBefore,
          notAfter: metadata.notAfter,
          serialNumber: metadata.serialNumber,
          isValid: await certificateManagerService.isCertificateValid(),
          isTestMode: metadata.isTestMode,
        };
        setCertificateInfo(certInfo);
      }
    } catch (error) {
      console.error('Error loading certificate info:', error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCertificateInfo();
    setRefreshing(false);
  }, []);

  const handleSaveConfig = async () => {
    try {
      await updateConfig({
        serverUrl,
        port,
        apiKey,
      });
      Alert.alert('Success', 'CA server configuration saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save configuration');
    }
  };

  const handleTestConnection = async () => {
    if (!serverUrl) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    setTesting(true);
    setConnectionStatus('idle');
    setConnectionMessage('');

    try {
      const result = await caServerService.testConnection({
        serverUrl,
        port,
        apiKey,
      });

      if (result.success) {
        setConnectionStatus('success');
        setConnectionMessage(result.message);
        await updateConfig({ connectionStatus: 'connected' });
      } else {
        setConnectionStatus('error');
        setConnectionMessage(result.message);
        await updateConfig({ connectionStatus: 'disconnected' });
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(error instanceof Error ? error.message : 'Connection failed');
      await updateConfig({ connectionStatus: 'disconnected' });
    } finally {
      setTesting(false);
    }
  };

  const handleFetchCertificate = async () => {
    if (demoMode) {
      // Generate test certificate
      setFetchingCert(true);
      try {
        const testCert = generateTestCertificate();
        await certificateManagerService.storeCertificate({
          certificatePem: testCert.certificate,
          privateKeyPem: testCert.privateKey,
          publicKeyPem: testCert.publicKey,
          fingerprint: testCert.fingerprint,
          issuer: testCert.issuer,
          subject: testCert.subject,
          serialNumber: testCert.serialNumber,
          notBefore: testCert.notBefore.toISOString(),
          notAfter: testCert.notAfter.toISOString(),
          isTestMode: true,
        });

        // Store test server public key
        await certificateManagerService.storeServerPublicKey(getTestServerPublicKey());

        await loadCertificateInfo();
        Alert.alert('Success', 'Demo certificate generated and stored');
      } catch (error) {
        Alert.alert('Error', 'Failed to generate demo certificate');
      } finally {
        setFetchingCert(false);
      }
      return;
    }

    // Real CA server certificate request
    if (!config.isConfigured) {
      Alert.alert('Error', 'Please configure and save CA server settings first');
      return;
    }

    setFetchingCert(true);
    try {
      caServerService.configure({
        serverUrl: config.serverUrl,
        port: config.port,
        apiKey: config.apiKey,
      });

      // Request certificate from CA
      const cert = await caServerService.requestCertificate({
        commonName: 'AgenticCommerce Mandate App',
        organization: 'AgenticCommerce',
        publicKey: '', // CA will generate key pair
      });

      // Store the certificate
      await certificateManagerService.storeCertificate({
        certificatePem: cert.certificatePem,
        privateKeyPem: cert.privateKeyPem || '',
        publicKeyPem: cert.publicKeyPem,
        fingerprint: cert.fingerprint,
        issuer: cert.issuer,
        subject: cert.subject,
        serialNumber: cert.serialNumber,
        notBefore: cert.notBefore,
        notAfter: cert.notAfter,
        isTestMode: false,
      });

      // Fetch and store server public key
      const serverKey = await caServerService.getServerPublicKey();
      await certificateManagerService.storeServerPublicKey(serverKey.publicKeyPem);

      await loadCertificateInfo();
      Alert.alert('Success', 'Certificate fetched and stored');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to fetch certificate');
    } finally {
      setFetchingCert(false);
    }
  };

  const handleRevokeCertificate = async () => {
    Alert.alert(
      'Revoke Certificate',
      'Are you sure you want to revoke this certificate? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setRevokingCert(true);
            try {
              if (!demoMode && certificateInfo && config.isConfigured) {
                // Notify CA server about revocation
                caServerService.configure({
                  serverUrl: config.serverUrl,
                  port: config.port,
                  apiKey: config.apiKey,
                });
                await caServerService.revokeCertificate({
                  certificateId: certificateInfo.fingerprint,
                  reason: 'cessationOfOperation',
                });
              }

              // Clear local certificate
              await certificateManagerService.revokeCertificate();
              setCertificateInfo(null);
              Alert.alert('Success', 'Certificate revoked');
            } catch (error) {
              Alert.alert('Error', 'Failed to revoke certificate');
            } finally {
              setRevokingCert(false);
            }
          },
        },
      ]
    );
  };

  const handleClearConfig = async () => {
    Alert.alert(
      'Clear Configuration',
      'This will remove all CA server settings and certificates. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearConfig();
              await certificateManagerService.clearAll();
              setCertificateInfo(null);
              setServerUrl('');
              setPort('443');
              setApiKey('');
              setConnectionStatus('idle');
              Alert.alert('Success', 'Configuration cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear configuration');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (configLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading configuration...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Demo Mode Toggle */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Demo Mode</Text>
        </View>
        <View style={styles.demoModeCard}>
          <View style={styles.demoModeRow}>
            <View style={styles.demoModeText}>
              <Text style={styles.demoModeLabel}>Enable Demo Mode</Text>
              <Text style={styles.demoModeDescription}>
                Use test certificates without CA server
              </Text>
            </View>
            <Switch
              value={demoMode}
              onValueChange={setDemoMode}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={demoMode ? '#2563EB' : '#F4F4F5'}
            />
          </View>
          {demoMode && (
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                Demo mode is enabled. Test certificates will not provide real security.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Server Connection Section */}
      {!demoMode && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Server Connection</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CA Server URL</Text>
            <TextInput
              style={styles.input}
              placeholder="https://ca.example.com"
              value={serverUrl}
              onChangeText={setServerUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Port</Text>
            <TextInput
              style={styles.input}
              placeholder="443"
              value={port}
              onChangeText={setPort}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>API Key</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter API key"
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowApiKey(!showApiKey)}
              >
                <Text style={styles.eyeButtonText}>{showApiKey ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleTestConnection}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Text style={styles.secondaryButtonText}>Test Connection</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleSaveConfig}
            >
              <Text style={styles.primaryButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          {connectionStatus !== 'idle' && (
            <View
              style={[
                styles.statusBanner,
                connectionStatus === 'success' ? styles.successBanner : styles.errorBanner,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  connectionStatus === 'success' ? styles.successText : styles.errorText,
                ]}
              >
                {connectionMessage}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Certificate Status Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Certificate Status</Text>
        </View>

        {certificateInfo ? (
          <View style={styles.certCard}>
            {certificateInfo.isTestMode && (
              <View style={styles.testModeBadge}>
                <Text style={styles.testModeBadgeText}>TEST CERTIFICATE</Text>
              </View>
            )}

            <View style={styles.certRow}>
              <Text style={styles.certLabel}>Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  certificateInfo.isValid ? styles.validBadge : styles.invalidBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    certificateInfo.isValid ? styles.validBadgeText : styles.invalidBadgeText,
                  ]}
                >
                  {certificateInfo.isValid ? 'Valid' : 'Invalid'}
                </Text>
              </View>
            </View>

            <View style={styles.certRow}>
              <Text style={styles.certLabel}>Issuer</Text>
              <Text style={styles.certValue} numberOfLines={2}>
                {certificateInfo.issuer}
              </Text>
            </View>

            <View style={styles.certRow}>
              <Text style={styles.certLabel}>Subject</Text>
              <Text style={styles.certValue} numberOfLines={2}>
                {certificateInfo.subject}
              </Text>
            </View>

            <View style={styles.certRow}>
              <Text style={styles.certLabel}>Fingerprint</Text>
              <Text style={styles.certValueMono} numberOfLines={1}>
                {certificateInfo.fingerprint}
              </Text>
            </View>

            <View style={styles.certRow}>
              <Text style={styles.certLabel}>Valid From</Text>
              <Text style={styles.certValue}>{formatDate(certificateInfo.notBefore)}</Text>
            </View>

            <View style={styles.certRow}>
              <Text style={styles.certLabel}>Valid Until</Text>
              <Text style={styles.certValue}>{formatDate(certificateInfo.notAfter)}</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleFetchCertificate}
                disabled={fetchingCert}
              >
                {fetchingCert ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Renew</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.dangerButton]}
                onPress={handleRevokeCertificate}
                disabled={revokingCert}
              >
                {revokingCert ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Text style={styles.dangerButtonText}>Revoke</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noCertCard}>
            <Text style={styles.noCertText}>No certificate installed</Text>
            <Text style={styles.noCertDescription}>
              {demoMode
                ? 'Generate a demo certificate for testing'
                : 'Configure CA server and fetch a certificate'}
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, styles.fullWidthButton]}
              onPress={handleFetchCertificate}
              disabled={fetchingCert || (!demoMode && !config.isConfigured)}
            >
              {fetchingCert ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {demoMode ? 'Generate Demo Certificate' : 'Fetch Certificate'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Clear Configuration */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.outlineDangerButton, styles.fullWidthButton]}
          onPress={handleClearConfig}
        >
          <Text style={styles.outlineDangerButtonText}>Clear All Configuration</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  demoModeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  demoModeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  demoModeText: {
    flex: 1,
    marginRight: 16,
  },
  demoModeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  demoModeDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  warningBanner: {
    marginTop: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  passwordContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeButton: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  eyeButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineDangerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  outlineDangerButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  fullWidthButton: {
    flex: 0,
    width: '100%',
  },
  statusBanner: {
    marginTop: 12,
    borderRadius: 8,
    padding: 12,
  },
  successBanner: {
    backgroundColor: '#D1FAE5',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 14,
  },
  successText: {
    color: '#065F46',
  },
  errorText: {
    color: '#991B1B',
  },
  certCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  testModeBadge: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
  },
  testModeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  certRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  certLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 100,
  },
  certValue: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'right',
  },
  certValueMono: {
    flex: 1,
    fontSize: 12,
    color: '#1F2937',
    fontFamily: 'monospace',
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  validBadge: {
    backgroundColor: '#D1FAE5',
  },
  invalidBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  validBadgeText: {
    color: '#065F46',
  },
  invalidBadgeText: {
    color: '#991B1B',
  },
  noCertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  noCertText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  noCertDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  bottomPadding: {
    height: 32,
  },
});
