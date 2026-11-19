import "server-only";
import { adminSupabase } from "./supabase/admin";

export async function checkRateLimit(userId: string): Promise<boolean> {
  const { data, error } = await adminSupabase.rpc(
    "consume_rate_limit",
    {
      p_user_id: userId,
      p_limit: 5,
      p_window_seconds: 900,
    }
  );

  if (error) {
    console.error("Rate limit check failed:", error);
    return false;
  }

  return data === true;
}