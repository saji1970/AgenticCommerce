import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../api/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  LoadingPage,
} from '../../components/common';
import { Settings, Shield, Bell, Database, CheckCircle } from 'lucide-react';
import { GeneralSettingsForm } from '../../components/settings/GeneralSettingsForm';
import { SecuritySettingsForm } from '../../components/settings/SecuritySettingsForm';
import { NotificationSettingsForm } from '../../components/settings/NotificationSettingsForm';
import { DataManagementForm } from '../../components/settings/DataManagementForm';

type TabKey = 'general' | 'security' | 'notifications' | 'data';

const tabs: Array<{ key: TabKey; label: string; icon: React.FC<{ className?: string }> }> = [
  { key: 'general', label: 'General', icon: Settings },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'data', label: 'Data Management', icon: Database },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll(),
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Array<{ category: string; key: string; value: unknown }>) =>
      settingsApi.update(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  if (isLoading) {
    return <LoadingPage message="Loading settings..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Configure platform settings and preferences</p>
        </div>
        <Alert variant="error" title="Error loading settings">
          Failed to load settings. Please try again.
        </Alert>
      </div>
    );
  }

  const settings = data?.settings || {};

  // Helper to extract value from setting
  const getValue = <T,>(category: string, key: string, defaultValue: T): T => {
    const setting = settings[category]?.[key];
    if (setting === undefined) return defaultValue;
    const value = setting.value ?? setting;
    return value as T;
  };

  // Convert settings to form values
  const generalValues = {
    platform_name: getValue('general', 'platform_name', 'AgenticCommerce'),
    session_timeout_minutes: getValue('general', 'session_timeout_minutes', 30),
    default_page_size: getValue('general', 'default_page_size', 25),
    max_page_size: getValue('general', 'max_page_size', 100),
  };

  const securityValues = {
    require_mfa: getValue('security', 'require_mfa', false),
    password_min_length: getValue('security', 'password_min_length', 12),
    password_require_special: getValue('security', 'password_require_special', true),
    password_require_numbers: getValue('security', 'password_require_numbers', true),
    max_login_attempts: getValue('security', 'max_login_attempts', 5),
    lockout_duration_minutes: getValue('security', 'lockout_duration_minutes', 30),
    certificate_expiry_warning_days: getValue('security', 'certificate_expiry_warning_days', 30),
  };

  const notificationValues = {
    email_enabled: getValue('notifications', 'email_enabled', true),
    email_from_address: getValue('notifications', 'email_from_address', 'admin@agenticcommerce.com'),
    alert_on_new_merchant: getValue('notifications', 'alert_on_new_merchant', true),
    alert_on_certificate_expiry: getValue('notifications', 'alert_on_certificate_expiry', true),
    alert_on_suspicious_activity: getValue('notifications', 'alert_on_suspicious_activity', true),
    daily_summary_enabled: getValue('notifications', 'daily_summary_enabled', false),
  };

  const dataValues = {
    audit_log_retention_days: getValue('data', 'audit_log_retention_days', 365),
    transaction_retention_days: getValue('data', 'transaction_retention_days', 730),
    session_retention_days: getValue('data', 'session_retention_days', 90),
    auto_backup_enabled: getValue('data', 'auto_backup_enabled', true),
    backup_frequency_hours: getValue('data', 'backup_frequency_hours', 24),
    backup_retention_count: getValue('data', 'backup_retention_count', 30),
  };

  const handleGeneralSubmit = (values: typeof generalValues) => {
    updateMutation.mutate(
      Object.entries(values).map(([key, value]) => ({
        category: 'general',
        key,
        value,
      }))
    );
  };

  const handleSecuritySubmit = (values: typeof securityValues) => {
    updateMutation.mutate(
      Object.entries(values).map(([key, value]) => ({
        category: 'security',
        key,
        value,
      }))
    );
  };

  const handleNotificationSubmit = (values: typeof notificationValues) => {
    updateMutation.mutate(
      Object.entries(values).map(([key, value]) => ({
        category: 'notifications',
        key,
        value,
      }))
    );
  };

  const handleDataSubmit = (values: typeof dataValues) => {
    updateMutation.mutate(
      Object.entries(values).map(([key, value]) => ({
        category: 'data',
        key,
        value,
      }))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Configure platform settings and preferences</p>
      </div>

      {successMessage && (
        <Alert variant="success">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </div>
        </Alert>
      )}

      {updateMutation.error && (
        <Alert variant="error" title="Error saving settings">
          {updateMutation.error instanceof Error
            ? updateMutation.error.message
            : 'Failed to save settings'}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Settings className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <CardTitle>General Settings</CardTitle>
                    <p className="text-sm text-gray-500">
                      Configure general platform settings
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <GeneralSettingsForm
                  initialValues={generalValues}
                  onSubmit={handleGeneralSubmit}
                  isLoading={updateMutation.isPending}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Security Settings</CardTitle>
                    <p className="text-sm text-gray-500">
                      Manage security policies and authentication
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <SecuritySettingsForm
                  initialValues={securityValues}
                  onSubmit={handleSecuritySubmit}
                  isLoading={updateMutation.isPending}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Bell className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <CardTitle>Notification Settings</CardTitle>
                    <p className="text-sm text-gray-500">
                      Configure email notifications and alerts
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <NotificationSettingsForm
                  initialValues={notificationValues}
                  onSubmit={handleNotificationSubmit}
                  isLoading={updateMutation.isPending}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'data' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Database className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Data Management</CardTitle>
                    <p className="text-sm text-gray-500">
                      Manage data retention and backup settings
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataManagementForm
                  initialValues={dataValues}
                  onSubmit={handleDataSubmit}
                  isLoading={updateMutation.isPending}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
