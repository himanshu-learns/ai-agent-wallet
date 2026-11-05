import type { Agent } from "./paymentEngine";
import { randomBytes, createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

function mapAgent(row: any): Agent {
  return {
    id: row.id,
    name: row.name,
    balance: Number(row.balance),
    dailyLimit: Number(row.daily_limit),
    transactionLimit: Number(row.transaction_limit),
    active: row.active,
    spentToday: Number(row.spent_today),
    allowedMerchants: row.allowed_merchants ?? [],
  };
}
export async function createAgent(
  db: SupabaseClient,
  userId: string,
  name: string,
  balance: number,
  dailyLimit: number,
  transactionLimit: number,
  allowedMerchants: string[]
 ): Promise<{ agent: Agent; apiKey: string } | null> {
  const apiKey = randomBytes(32).toString("hex");
  const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");

  const { data, error } = await db
    .from("agents")
    .insert({
      name,
      balance,
      daily_limit: dailyLimit,
      transaction_limit: transactionLimit,
      active: true,
      spent_today: 0,
      api_key_hash: apiKeyHash,
      allowed_merchants: allowedMerchants,
      user_id: userId,
    })
    .select(
  "id, name, balance, daily_limit, transaction_limit, active, spent_today, allowed_merchants"
)
.single();

 if (error || !data) return null;

return {
  agent: mapAgent(data),
  apiKey,
};
}