import { useForm } from 'react-hook-form';
import { Input, Button } from '../common';

interface GeneralSettings {
  platform_name: string;
  session_timeout_minutes: number;
  default_page_size: number;
  max_page_size: number;
}

interface GeneralSettingsFormProps {
  initialValues: GeneralSettings;
  onSubmit: (values: GeneralSettings) => void;
  isLoading?: boolean;
}

export function GeneralSettingsForm({ initialValues, onSubmit, isLoading }: GeneralSettingsFormProps) {
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<GeneralSettings>({
    defaultValues: initialValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Platform Name"
        {...register('platform_name', { required: 'Platform name is required' })}
        error={errors.platform_name?.message}
      />

      <Input
        label="Session Timeout (minutes)"
        type="number"
        {...register('session_timeout_minutes', {
          required: 'Session timeout is required',
          min: { value: 5, message: 'Minimum 5 minutes' },
          max: { value: 480, message: 'Maximum 480 minutes (8 hours)' },
          valueAsNumber: true,
        })}
        error={errors.session_timeout_minutes?.message}
      />

      <Input
        label="Default Page Size"
        type="number"
        {...register('default_page_size', {
          required: 'Default page size is required',
          min: { value: 10, message: 'Minimum 10' },
          max: { value: 100, message: 'Maximum 100' },
          valueAsNumber: true,
        })}
        error={errors.default_page_size?.message}
      />

      <Input
        label="Maximum Page Size"
        type="number"
        {...register('max_page_size', {
          required: 'Max page size is required',
          min: { value: 50, message: 'Minimum 50' },
          max: { value: 500, message: 'Maximum 500' },
          valueAsNumber: true,
        })}
        error={errors.max_page_size?.message}
      />

      <div className="flex justify-end pt-4">
        <Button type="submit" isLoading={isLoading} disabled={!isDirty}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
