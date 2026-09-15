export type Transaction = {
  id: number;
  agentId: number;
  merchant: string;
  amount: number;
  status: "Approved" | "Blocked" | "Pending" | "Rejected";
  reason: string;
  createdAt: string;
};

export const transactions: Transaction[] = [];

export function createTransaction(
  agentId: number,
  merchant: string,
  amount: number,
  status: "Approved" | "Blocked" | "Pending" | "Rejected",
  reason: string
): Transaction {
  const transaction: Transaction = {
    id: Date.now(),
    agentId,
    merchant,
    amount,
    status,
    reason,
    createdAt: new Date().toISOString(),
  };

  transactions.unshift(transaction);

  return transaction;
}

export function findTransaction(transactionId: number) {
  return transactions.find(
    (transaction) => transaction.id === transactionId
  );
}

export function approveTransaction(transactionId: number): boolean {
  const transaction = findTransaction(transactionId);

  if (!transaction || transaction.status !== "Pending") {
    return false;
  }

  transaction.status = "Approved";
  transaction.reason = "Payment approved by user";

  return true;
}

export function rejectTransaction(transactionId: number): boolean {
  const transaction = findTransaction(transactionId);

  if (!transaction || transaction.status !== "Pending") {
    return false;
  }

  transaction.status = "Rejected";
  transaction.reason = "Payment rejected by user";

  return true;
}