export type Transaction = {
  id: number;
  agentId: number;
  merchant: string;
  amount: number;
  status: "Approved" | "Blocked";
  reason: string;
  createdAt: string;
};

export function createTransaction(
  agentId: number,
  merchant: string,
  amount: number,
  approved: boolean,
  reason: string
): Transaction {
  return {
    id: Date.now(),
    agentId,
    merchant,
    amount,
    status: approved ? "Approved" : "Blocked",
    reason,
    createdAt: new Date().toISOString(),
  };
}