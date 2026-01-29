import { useForm } from 'react-hook-form';
import { Input, Button, Checkbox } from '../common';

interface DataManagementSettings {
  audit_log_retention_days: number;
  transaction_retention_days: number;
  session_retention_days: number;
  auto_backup_enabled: boolean;
  backup_frequency_hours: number;
  backup_retention_count: number;
}

interface DataManagementFormProps {
  initialValues: DataManagementSettings;
  onSubmit: (values: DataManagementSettings) => void;
  isLoading?: boolean;
}

export function DataManagementForm({ initialValues, onSubmit, isLoading }: DataManagementFormProps) {
  const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm<DataManagementSettings>({
    defaultValues: initialValues,
  });

  const autoBackupEnabled = watch('auto_backup_enabled');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700">Data Retention</h4>

      <Input
        label="Audit Log Retention (days)"
        type="number"
        {...register('audit_log_retention_days', {
          required: 'Required',
          min: { value: 30, message: 'Minimum 30 days' },
          max: { value: 2555, message: 'Maximum 7 years (2555 days)' },
          valueAsNumber: true,
        })}
        error={errors.audit_log_retention_days?.message}
      />

      <Input
        label="Transaction Retention (days)"
        type="number"
        {...register('transaction_retention_days', {
          required: 'Required',
          min: { value: 90, message: 'Minimum 90 days' },
          max: { value: 3650, message: 'Maximum 10 years (3650 days)' },
          valueAsNumber: true,
        })}
        error={errors.transaction_retention_days?.message}
      />

      <Input
        label="Session Data Retention (days)"
        type="number"
        {...register('session_retention_days', {
          required: 'Required',
          min: { value: 7, message: 'Minimum 7 days' },
          max: { value: 365, message: 'Maximum 365 days' },
          valueAsNumber: true,
        })}
        error={errors.session_retention_days?.message}
      />

      <div className="pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Backup Settings</h4>

        <div className="space-y-3">
          <Checkbox
            label="Enable Automatic Backups"
            {...register('auto_backup_enabled')}
          />
        </div>

        <div className="mt-4 space-y-4">
          <Input
            label="Backup Frequency (hours)"
            type="number"
            {...register('backup_frequency_hours', {
              required: autoBackupEnabled ? 'Required when auto backup is enabled' : false,
              min: { value: 1, message: 'Minimum 1 hour' },
              max: { value: 168, message: 'Maximum 168 hours (1 week)' },
              valueAsNumber: true,
            })}
            error={errors.backup_frequency_hours?.message}
            disabled={!autoBackupEnabled}
          />

          <Input
            label="Number of Backups to Retain"
            type="number"
            {...register('backup_retention_count', {
              required: autoBackupEnabled ? 'Required when auto backup is enabled' : false,
              min: { value: 1, message: 'Minimum 1 backup' },
              max: { value: 100, message: 'Maximum 100 backups' },
              valueAsNumber: true,
            })}
            error={errors.backup_retention_count?.message}
            disabled={!autoBackupEnabled}
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
