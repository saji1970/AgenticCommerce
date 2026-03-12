import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Alert,
  EmptyState,
} from '../../components/common';
import { CreditCard, Trash2, Star, Plus, ChevronDown, ChevronUp, Wallet } from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  label: string;
  last4?: string;
  expiry?: string;
  cardholderName?: string;
  email?: string;
  isDefault: boolean;
}

// Simulated stored methods (in production, these come from API)
const INITIAL_METHODS: PaymentMethod[] = [
  {
    id: '1',
    type: 'card',
    label: 'Visa',
    last4: '4242',
    expiry: '12/27',
    cardholderName: 'Demo User',
    isDefault: true,
  },
  {
    id: '2',
    type: 'card',
    label: 'Mastercard',
    last4: '8210',
    expiry: '03/28',
    cardholderName: 'Demo User',
    isDefault: false,
  },
];

function luhnCheck(num: string): boolean {
  const digits = num.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>(INITIAL_METHODS);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);

  // Wallet form state
  const [paypalEmail, setPaypalEmail] = useState('');

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleSetDefault = (id: string) => {
    setMethods((prev) =>
      prev.map((m) => ({ ...m, isDefault: m.id === id }))
    );
    setSuccess('Default payment method updated');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleRemove = (id: string) => {
    setMethods((prev) => prev.filter((m) => m.id !== id));
    setSuccess('Payment method removed');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleAddCard = () => {
    setCardError(null);
    const digits = cardNumber.replace(/\s/g, '');

    if (!luhnCheck(digits)) {
      setCardError('Invalid card number');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      setCardError('Expiry must be MM/YY format');
      return;
    }
    if (!/^\d{3,4}$/.test(cardCvv)) {
      setCardError('CVV must be 3 or 4 digits');
      return;
    }
    if (!cardName.trim()) {
      setCardError('Cardholder name is required');
      return;
    }

    const brand = digits.startsWith('4') ? 'Visa' : digits.startsWith('5') ? 'Mastercard' : 'Card';

    setMethods((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'card',
        label: brand,
        last4: digits.slice(-4),
        expiry: cardExpiry,
        cardholderName: cardName,
        isDefault: prev.length === 0,
      },
    ]);

    setCardNumber('');
    setCardName('');
    setCardExpiry('');
    setCardCvv('');
    setShowAddCard(false);
    setSuccess('Card added successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleLinkPaypal = () => {
    if (!paypalEmail.includes('@')) return;
    setMethods((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: 'paypal',
        label: 'PayPal',
        email: paypalEmail,
        isDefault: prev.length === 0,
      },
    ]);
    setPaypalEmail('');
    setShowAddWallet(false);
    setSuccess('PayPal linked successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage saved payment methods for AI agent transactions
        </p>
      </div>

      {success && <Alert variant="success">{success}</Alert>}

      {/* Saved Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          {methods.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-10 w-10 text-gray-300" />}
              title="No payment methods saved"
              description="Add a card or wallet to get started."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {methods.map((method) => (
                <div key={method.id} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      {method.type === 'card' && <CreditCard className="h-5 w-5 text-gray-600" />}
                      {method.type === 'paypal' && <span className="text-blue-600 font-bold text-sm">P</span>}
                      {method.type === 'apple_pay' && <span className="text-gray-800 font-bold text-sm">AP</span>}
                      {method.type === 'google_pay' && <span className="text-blue-500 font-bold text-sm">G</span>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {method.label} {method.last4 ? `****${method.last4}` : ''}
                          {method.email ? `(${method.email})` : ''}
                        </span>
                        {method.isDefault && (
                          <Badge variant="success" size="sm">Default</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {method.expiry && <span>Expires {method.expiry}</span>}
                        {method.cardholderName && <span>{method.cardholderName}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemove(method.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Card */}
      <Card>
        <button
          type="button"
          className="w-full flex items-center justify-between px-6 py-4"
          onClick={() => setShowAddCard(!showAddCard)}
        >
          <div className="flex items-center gap-3">
            <Plus className="h-5 w-5 text-primary-600" />
            <span className="text-sm font-semibold text-gray-900">Add Card</span>
          </div>
          {showAddCard ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {showAddCard && (
          <CardContent className="border-t border-gray-200 space-y-4">
            {cardError && <Alert variant="error">{cardError}</Alert>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="4111 1111 1111 1111"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="John Doe"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="123"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                />
              </div>
            </div>

            <Button onClick={handleAddCard} className="w-full">
              <CreditCard className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Add Wallet */}
      <Card>
        <button
          type="button"
          className="w-full flex items-center justify-between px-6 py-4"
          onClick={() => setShowAddWallet(!showAddWallet)}
        >
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-primary-600" />
            <span className="text-sm font-semibold text-gray-900">Add Wallet</span>
          </div>
          {showAddWallet ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>
        {showAddWallet && (
          <CardContent className="border-t border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PayPal Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="you@example.com"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
              />
            </div>
            <Button onClick={handleLinkPaypal} disabled={!paypalEmail.includes('@')} className="w-full">
              Link PayPal
            </Button>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between py-3 opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-600">AP</div>
                  <span className="text-sm text-gray-700">Apple Pay</span>
                </div>
                <Badge variant="default" size="sm">Coming Soon</Badge>
              </div>
              <div className="flex items-center justify-between py-3 opacity-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-blue-500">G</div>
                  <span className="text-sm text-gray-700">Google Pay</span>
                </div>
                <Badge variant="default" size="sm">Coming Soon</Badge>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
