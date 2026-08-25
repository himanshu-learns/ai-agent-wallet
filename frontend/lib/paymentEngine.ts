export type Agent = {
  id: number;
  name: string;
  balance: number;
  dailyLimit: number;
  transactionLimit: number;
  active: boolean;
  spentToday?: number;
};

export type PaymentRequest = {
  agentId: number;
  merchant: string;
  amount: number;
};

export type PaymentDecision = {
  approved: boolean;
  reason: string;
};

export function evaluatePayment(
  agent: Agent,
  request: PaymentRequest
): PaymentDecision {
  // 1. Agent must be active
  if (!agent.active) {
    return {
      approved: false,
      reason: "Agent is paused",
    };
  }

  // 2. Amount must be greater than zero
  if (request.amount <= 0) {
    return {
      approved: false,
      reason: "Payment amount must be greater than zero",
    };
  }

  // 3. Check wallet balance
  if (request.amount > agent.balance) {
    return {
      approved: false,
      reason: "Insufficient wallet balance",
    };
  }

  // 4. Check per-transaction limit
  if (request.amount > agent.transactionLimit) {
    return {
      approved: false,
      reason: `Payment exceeds transaction limit of $${agent.transactionLimit.toFixed(
        2
      )}`,
    };
  }

  // 5. Check daily spending limit
  const spentToday = agent.spentToday ?? 0;

  if (spentToday + request.amount > agent.dailyLimit) {
    return {
      approved: false,
      reason: `Payment exceeds daily spending limit of $${agent.dailyLimit.toFixed(
        2
      )}`,
    };
  }

  // 6. Payment passes all policies
  return {
    approved: true,
    reason: "Payment approved",
  };
}