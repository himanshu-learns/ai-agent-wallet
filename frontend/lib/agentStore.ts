import type { Agent } from "./paymentEngine";
import { supabase } from "./supabase";

function mapAgent(row: any): Agent {
  return {
    id: row.id,
    name: row.name,
    balance: Number(row.balance),
    dailyLimit: Number(row.daily_limit),
    transactionLimit: Number(row.transaction_limit),
    active: row.active,
    spentToday: Number(row.spent_today),
    apiKey: row.api_key,
    allowedMerchants: row.allowed_merchants ?? [],
  };
}

export async function findAgent(agentId: number) {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (error || !data) {
    return undefined;
  }

  return mapAgent(data);
}

export async function updateAgentAfterPayment(
  agentId: number,
  amount: number
) {
  const agent = await findAgent(agentId);

  if (!agent) {
    return false;
  }

  const newBalance = agent.balance - amount;
  const newSpentToday = (agent.spentToday ?? 0) + amount;

  const { data, error } = await supabase
    .from("agents")
    .update({
      balance: newBalance,
      spent_today: newSpentToday,
    })
    .eq("id", agentId)
    .select()
    .single();

  return !error;
}
export async function toggleAgent(agentId: number) {
  const agent = await findAgent(agentId);

  if (!agent) {
    return null;
  }

  const { data, error } = await supabase
    .from("agents")
    .update({
      active: !agent.active,
    })
    .eq("id", agentId)
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return mapAgent(data);
}

export async function createAgent(
  name: string,
  balance: number,
  dailyLimit: number,
  transactionLimit: number,
  allowedMerchants: string[]
): Promise<Agent | null> {
  const apiKey = `sandbox-agent-key-${Date.now()}`;

  const { data, error } = await supabase
    .from("agents")
    .insert({
      name,
      balance,
      daily_limit: dailyLimit,
      transaction_limit: transactionLimit,
      active: true,
      spent_today: 0,
      api_key: apiKey,
      allowed_merchants: allowedMerchants,
    })
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return mapAgent(data);
}