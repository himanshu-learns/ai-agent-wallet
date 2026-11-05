
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/supabase/server";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();

    if (!auth) {
      return NextResponse.json(
        { success: false, reason: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await auth.supabase
      .from("transactions")
      .select(`
        id,
        agent_id,
        merchant,
        amount,
        status,
        reason,
        created_at,
        agents!inner(user_id)
      `)
      .eq("agents.user_id", auth.user.id)
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
  } catch {
    return NextResponse.json(
      {
        success: false,
        reason: "Unable to fetch transactions",
      },
      { status: 500 }
    );
  }
}
