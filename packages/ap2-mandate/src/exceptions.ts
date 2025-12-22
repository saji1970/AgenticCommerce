/**
 * AP2 Mandate Exception Classes
 */

export class MandateException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MandateException';
  }
}

export class ExpiredMandateException extends MandateException {
  constructor(message: string = 'Mandate has expired') {
    super(message);
    this.name = 'ExpiredMandateException';
  }
}

export class InvalidSignatureException extends MandateException {
  constructor(message: string = 'Invalid mandate signature') {
    super(message);
    this.name = 'InvalidSignatureException';
  }
}

export class BudgetExceededException extends MandateException {
  constructor(
    totalPrice: number,
    maxPrice: number,
    message?: string
  ) {
    super(
      message ||
        `Total price $${totalPrice.toFixed(2)} exceeds maximum budget $${maxPrice.toFixed(2)}`
    );
    this.name = 'BudgetExceededException';
  }
}

export class MerchantNotApprovedException extends MandateException {
  constructor(merchantName: string, message?: string) {
    super(message || `Merchant '${merchantName}' is not in the approved list`);
    this.name = 'MerchantNotApprovedException';
  }
}

export class MerchantBlockedException extends MandateException {
  constructor(merchantName: string, message?: string) {
    super(message || `Merchant '${merchantName}' is blocked`);
    this.name = 'MerchantBlockedException';
  }
}

export class MandateMismatchException extends MandateException {
  constructor(message: string = 'Cart Mandate does not match Intent Mandate') {
    super(message);
    this.name = 'MandateMismatchException';
  }
}
