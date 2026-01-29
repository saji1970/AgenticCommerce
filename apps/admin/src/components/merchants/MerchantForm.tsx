import { useForm } from 'react-hook-form';
import { Button, Input, Select, Alert } from '../common';

interface MerchantFormData {
  name: string;
  businessName: string;
  email: string;
  website?: string;
  tier: string;
  webhookUrl?: string;
}

interface MerchantFormProps {
  initialData?: Partial<MerchantFormData>;
  onSubmit: (data: MerchantFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
}

const tierOptions = [
  { value: 'starter', label: 'Starter' },
  { value: 'business', label: 'Business' },
  { value: 'enterprise', label: 'Enterprise' },
];

export function MerchantForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: MerchantFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MerchantFormData>({
    defaultValues: {
      name: initialData?.name || '',
      businessName: initialData?.businessName || '',
      email: initialData?.email || '',
      website: initialData?.website || '',
      tier: initialData?.tier || 'starter',
      webhookUrl: initialData?.webhookUrl || '',
    },
  });

  const onFormSubmit = async (data: MerchantFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      <Input
        id="name"
        label="Contact Name"
        {...register('name', { required: 'Contact name is required' })}
        error={errors.name?.message}
      />

      <Input
        id="businessName"
        label="Business Name"
        {...register('businessName', { required: 'Business name is required' })}
        error={errors.businessName?.message}
      />

      <Input
        id="email"
        label="Email"
        type="email"
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address',
          },
        })}
        error={errors.email?.message}
      />

      <Input
        id="website"
        label="Website (optional)"
        {...register('website')}
        placeholder="https://example.com"
      />

      <Select
        id="tier"
        label="Tier"
        options={tierOptions}
        {...register('tier')}
      />

      <Input
        id="webhookUrl"
        label="Webhook URL (optional)"
        {...register('webhookUrl')}
        placeholder="https://api.example.com/webhook"
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {initialData ? 'Update Merchant' : 'Create Merchant'}
        </Button>
      </div>
    </form>
  );
}
