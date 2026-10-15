import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET TRANSACTIONS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        reason: "Unable to fetch transactions",
      },
      { status: 500 }
    );
  }

  const transactions = data.map((transaction) => ({
    id: transaction.id,
    agentId: transaction.agent_id,
    merchant: transaction.merchant,
    amount: Number(transaction.amount),
    status: transaction.status,
    reason: transaction.reason,
    createdAt: transaction.created_at,
  }));

  return NextResponse.json({
    success: true,
    transactions,
  });
}