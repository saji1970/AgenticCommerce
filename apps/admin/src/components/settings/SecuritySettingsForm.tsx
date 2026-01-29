import { useForm } from 'react-hook-form';
import { Input, Button, Checkbox } from '../common';

interface SecuritySettings {
  require_mfa: boolean;
  password_min_length: number;
  password_require_special: boolean;
  password_require_numbers: boolean;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  certificate_expiry_warning_days: number;
}

interface SecuritySettingsFormProps {
  initialValues: SecuritySettings;
  onSubmit: (values: SecuritySettings) => void;
  isLoading?: boolean;
}

export function SecuritySettingsForm({ initialValues, onSubmit, isLoading }: SecuritySettingsFormProps) {
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<SecuritySettings>({
    defaultValues: initialValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-3">
        <Checkbox
          label="Require Multi-Factor Authentication (MFA)"
          {...register('require_mfa')}
        />

        <Checkbox
          label="Require Special Characters in Passwords"
          {...register('password_require_special')}
        />

        <Checkbox
          label="Require Numbers in Passwords"
          {...register('password_require_numbers')}
        />
      </div>

      <Input
        label="Minimum Password Length"
        type="number"
        {...register('password_min_length', {
          required: 'Required',
          min: { value: 8, message: 'Minimum 8 characters' },
          max: { value: 32, message: 'Maximum 32 characters' },
          valueAsNumber: true,
        })}
        error={errors.password_min_length?.message}
      />

      <Input
        label="Maximum Login Attempts"
        type="number"
        {...register('max_login_attempts', {
          required: 'Required',
          min: { value: 3, message: 'Minimum 3 attempts' },
          max: { value: 10, message: 'Maximum 10 attempts' },
          valueAsNumber: true,
        })}
        error={errors.max_login_attempts?.message}
      />

      <Input
        label="Account Lockout Duration (minutes)"
        type="number"
        {...register('lockout_duration_minutes', {
          required: 'Required',
          min: { value: 5, message: 'Minimum 5 minutes' },
          max: { value: 1440, message: 'Maximum 1440 minutes (24 hours)' },
          valueAsNumber: true,
        })}
        error={errors.lockout_duration_minutes?.message}
      />

      <Input
        label="Certificate Expiry Warning (days)"
        type="number"
        {...register('certificate_expiry_warning_days', {
          required: 'Required',
          min: { value: 7, message: 'Minimum 7 days' },
          max: { value: 90, message: 'Maximum 90 days' },
          valueAsNumber: true,
        })}
        error={errors.certificate_expiry_warning_days?.message}
      />

      <div className="flex justify-end pt-4">
        <Button type="submit" isLoading={isLoading} disabled={!isDirty}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
