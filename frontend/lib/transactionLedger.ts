import { supabase } from "./supabase";

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

export async function createTransaction(
  agentId: number,
  merchant: string,
  amount: number,
  status: "Approved" | "Blocked" | "Pending" | "Rejected",
  reason: string
): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      agent_id: agentId,
      merchant,
      amount,
      status,
      reason,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("CREATE TRANSACTION ERROR:", error);
    return null;
  }

  return {
    id: data.id,
    agentId: data.agent_id,
    merchant: data.merchant,
    amount: Number(data.amount),
    status: data.status,
    reason: data.reason,
    createdAt: data.created_at,
  };
}

export async function findTransaction(
  transactionId: number
): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (error || !data) {
    console.error("FIND TRANSACTION ERROR:", error);
    return null;
  }

  return {
    id: data.id,
    agentId: data.agent_id,
    merchant: data.merchant,
    amount: Number(data.amount),
    status: data.status,
    reason: data.reason,
    createdAt: data.created_at,
  };
}

export async function approveTransaction(
  transactionId: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from("transactions")
    .update({
      status: "Approved",
      reason: "Payment approved by user",
    })
    .eq("id", transactionId)
    .eq("status", "Pending")
    .select()
    .maybeSingle();

  if (error) {
    console.error("APPROVE TRANSACTION ERROR:", error);
    return false;
  }

  return !!data;
}

export async function rejectTransaction(
  transactionId: number
): Promise<boolean> {
  const transaction = await findTransaction(transactionId);

  if (!transaction || transaction.status !== "Pending") {
    return false;
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      status: "Rejected",
      reason: "Payment rejected by user",
    })
    .eq("id", transactionId);

  if (error) {
    console.error("REJECT TRANSACTION ERROR:", error);
    return false;
  }

  return true;
}