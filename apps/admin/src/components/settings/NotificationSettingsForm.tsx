import { useForm } from 'react-hook-form';
import { Input, Button, Checkbox } from '../common';

interface NotificationSettings {
  email_enabled: boolean;
  email_from_address: string;
  alert_on_new_merchant: boolean;
  alert_on_certificate_expiry: boolean;
  alert_on_suspicious_activity: boolean;
  daily_summary_enabled: boolean;
}

interface NotificationSettingsFormProps {
  initialValues: NotificationSettings;
  onSubmit: (values: NotificationSettings) => void;
  isLoading?: boolean;
}

export function NotificationSettingsForm({ initialValues, onSubmit, isLoading }: NotificationSettingsFormProps) {
  const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm<NotificationSettings>({
    defaultValues: initialValues,
  });

  const emailEnabled = watch('email_enabled');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-3">
        <Checkbox
          label="Enable Email Notifications"
          {...register('email_enabled')}
        />
      </div>

      <Input
        label="From Email Address"
        type="email"
        {...register('email_from_address', {
          required: emailEnabled ? 'From address is required when email is enabled' : false,
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address',
          },
        })}
        error={errors.email_from_address?.message}
        disabled={!emailEnabled}
      />

      <div className="pt-2">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Alert Preferences</h4>
        <div className="space-y-3">
          <Checkbox
            label="Alert on New Merchant Registration"
            {...register('alert_on_new_merchant')}
            disabled={!emailEnabled}
          />

          <Checkbox
            label="Alert on Certificate Expiry"
            {...register('alert_on_certificate_expiry')}
            disabled={!emailEnabled}
          />

          <Checkbox
            label="Alert on Suspicious Activity"
            {...register('alert_on_suspicious_activity')}
            disabled={!emailEnabled}
          />

          <Checkbox
            label="Enable Daily Summary Emails"
            {...register('daily_summary_enabled')}
            disabled={!emailEnabled}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" isLoading={isLoading} disabled={!isDirty}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
