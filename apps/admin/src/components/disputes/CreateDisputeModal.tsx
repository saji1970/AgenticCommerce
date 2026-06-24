import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { disputesApi } from '../../api/client';
import { Modal, Button, Input, Select } from '../common';

interface CreateDisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillTransactionId?: string;
  prefillAmount?: number;
  prefillCurrency?: string;
}

const REASON_OPTIONS = [
  { value: 'unauthorized', label: 'Unauthorized Transaction' },
  { value: 'duplicate', label: 'Duplicate Charge' },
  { value: 'fraud', label: 'Fraud' },
  { value: 'not_received', label: 'Product/Service Not Received' },
  { value: 'not_as_described', label: 'Not As Described' },
  { value: 'other', label: 'Other' },
];

export function CreateDisputeModal({
  isOpen,
  onClose,
  prefillTransactionId,
  prefillAmount,
  prefillCurrency,
}: CreateDisputeModalProps) {
  const queryClient = useQueryClient();
  const [transactionId, setTransactionId] = useState(prefillTransactionId || '');
  const [reason, setReason] = useState('unauthorized');
  const [disputeAmount, setDisputeAmount] = useState(prefillAmount?.toString() || '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      disputesApi.create({
        transactionId,
        reason,
        disputeAmount: parseFloat(disputeAmount),
        currency: prefillCurrency || 'USD',
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      onClose();
      setTransactionId('');
      setReason('unauthorized');
      setDisputeAmount('');
      setNotes('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || err.message || 'Failed to create dispute');
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Dispute">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
          <Input
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="Enter transaction UUID"
            disabled={!!prefillTransactionId}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <Select
            options={REASON_OPTIONS}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dispute Amount</label>
          <Input
            type="number"
            step="0.01"
            value={disputeAmount}
            onChange={(e) => setDisputeAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!transactionId || !disputeAmount || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Dispute'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
