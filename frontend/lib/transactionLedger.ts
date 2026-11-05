export type Transaction = {
  id: number;
  agentId: number;
  merchant: string;
  amount: number;
  status: "Approved" | "Blocked" | "Pending" | "Rejected";
  reason: string;
  createdAt: string;
};