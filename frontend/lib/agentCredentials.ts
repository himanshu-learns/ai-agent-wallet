
import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import type { Agent } from "./paymentEngine";
import { adminSupabase } from "./supabase/admin";

function hashKey(key: string): Buffer {
  return createHash("sha256").update(key).digest();
}

export async function authenticateAgent(
  agentId: number,
  apiKey: string
): Promise<Agent | null> {
  const { data, error } = await adminSupabase
    .from("agents")
    .select(`
      id,
      name,
      balance,
      daily_limit,
      transaction_limit,
      active,
      spent_today,
      allowed_merchants,
      api_key_hash,
      api_key
    `)
    .eq("id", agentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const providedHash = hashKey(apiKey);
  let isValid = false;

  if (data.api_key_hash) {
    const storedHash = Buffer.from(data.api_key_hash, "hex");

    isValid =
      storedHash.length === providedHash.length &&
      timingSafeEqual(storedHash, providedHash);
  } else if (data.api_key) {
    // Temporary support for legacy plaintext keys.
    isValid = timingSafeEqual(
      hashKey(data.api_key),
      providedHash
    );
  }

  if (!isValid) {
    return null;
  }

  const agent: Agent = {
    id: data.id,
    name: data.name,
    balance: Number(data.balance),
    dailyLimit: Number(data.daily_limit),
    transactionLimit: Number(data.transaction_limit),
    active: data.active,
    spentToday: Number(data.spent_today),
    allowedMerchants: data.allowed_merchants ?? [],
  };

  return agent;
}
