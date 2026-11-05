
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

    // Verify that this transaction belongs to the logged-in user.
    const { data: transaction, error: fetchError } =
      await auth.supabase
        .from("transactions")
        .select("id, status, agents!inner(user_id)")
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

    // Update only the verified owner's pending transaction.
    const { data: rejected, error: rejectError } =
      await auth.supabase
        .from("transactions")
        .update({ status: "Rejected" })
        .eq("id", transactionId)
        .eq("status", "Pending")
        .select("id, agent_id, merchant, amount, status, reason, created_at")
        .maybeSingle();

    if (rejectError || !rejected) {
      return NextResponse.json(
        {
          success: false,
          reason: "Unable to reject transaction",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: rejected.id,
        agentId: rejected.agent_id,
        merchant: rejected.merchant,
        amount: Number(rejected.amount),
        status: rejected.status,
        reason: rejected.reason,
        createdAt: rejected.created_at,
      },
    });
  } catch (error) {
    console.error("REJECT API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        reason: "Unable to process rejection request",
      },
      { status: 500 }
    );
  }
}

