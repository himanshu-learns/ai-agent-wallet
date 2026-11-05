
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/supabase/server";

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser();

    if (!auth) {
      return NextResponse.json(
        { success: false, reason: "Unauthorized" },
        { status: 401 }
      );
    }

    let body: { transactionId?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, reason: "Invalid JSON request" },
        { status: 400 }
      );
    }

    const transactionId = body.transactionId;

    if (
      typeof transactionId !== "number" ||
      !Number.isSafeInteger(transactionId) ||
      transactionId <= 0
    ) {
      return NextResponse.json(
        { success: false, reason: "Invalid transaction ID" },
        { status: 400 }
      );
    }

    // Verify transaction ownership before approval.
    const { data: transaction, error: fetchError } =
      await auth.supabase
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
        .eq("id", transactionId)
        .eq("agents.user_id", auth.user.id)
        .maybeSingle();

    if (fetchError || !transaction) {
      return NextResponse.json(
        { success: false, reason: "Transaction not found" },
        { status: 404 }
      );
    }

    if (transaction.status !== "Pending") {
      return NextResponse.json(
        { success: false, reason: "Transaction is not pending" },
        { status: 400 }
      );
    }

    // Preserve the existing atomic database approval.
    const { data: approvalResult, error: approvalError } =
      await auth.supabase.rpc("approve_transaction_atomic", {
        p_transaction_id: transaction.id,
      });

    if (approvalError) {
      console.error("ATOMIC APPROVAL ERROR:", approvalError);

      return NextResponse.json(
        { success: false, reason: "Unable to approve transaction" },
        { status: 500 }
      );
    }

    if (!approvalResult?.success) {
      return NextResponse.json(
        {
          success: false,
          reason: approvalResult?.reason ?? "Transaction could not be approved",
        },
        { status: 400 }
      );
    }

    // Fetch the updated transaction.
    const { data: updatedTransaction, error: reloadError } =
      await auth.supabase
        .from("transactions")
        .select("id, agent_id, merchant, amount, status, reason, created_at")
        .eq("id", transaction.id)
        .maybeSingle();

    const { data: updatedAgent, error: agentError } =
      await auth.supabase
        .from("agents")
        .select("id, balance, spent_today")
        .eq("id", transaction.agent_id)
        .eq("user_id", auth.user.id)
        .maybeSingle();

    if (
      reloadError ||
      agentError ||
      !updatedTransaction ||
      !updatedAgent
    ) {
      return NextResponse.json(
        {
          success: false,
          reason: "Approved transaction could not be reloaded",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: updatedTransaction.id,
        agentId: updatedTransaction.agent_id,
        merchant: updatedTransaction.merchant,
        amount: Number(updatedTransaction.amount),
        status: updatedTransaction.status,
        reason: updatedTransaction.reason,
        createdAt: updatedTransaction.created_at,
      },
      agent: {
        id: updatedAgent.id,
        balance: Number(updatedAgent.balance),
        spentToday: Number(updatedAgent.spent_today),
      },
    });
  } catch (error) {
    console.error("APPROVE API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        reason: "Unable to process approval request",
      },
      { status: 500 }
    );
  }
}
