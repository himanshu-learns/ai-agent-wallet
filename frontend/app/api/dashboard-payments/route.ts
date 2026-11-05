import { NextResponse } from "next/server";
import { evaluatePayment } from "../../../lib/paymentEngine";
import { getAuthenticatedUser } from "../../../lib/supabase/server";
import { adminSupabase } from "../../../lib/supabase/admin";

type PaymentRequest = {
  agentId: number;
  merchant: string;
  amount: number;
};

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser();

    if (!auth) {
      return NextResponse.json(
        { success: false, approved: false, reason: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as PaymentRequest;

    if (
      !Number.isSafeInteger(body.agentId) ||
      body.agentId <= 0 ||
      typeof body.merchant !== "string" ||
      !body.merchant.trim() ||
      typeof body.amount !== "number" ||
      !Number.isFinite(body.amount) ||
      body.amount <= 0
    ) {
      return NextResponse.json(
        { success: false, approved: false, reason: "Invalid payment request" },
        { status: 400 }
      );
    }

    // Verify that this agent belongs to the logged-in user.
    const { data, error } = await adminSupabase
      .from("agents")
      .select(
        "id, name, balance, daily_limit, transaction_limit, active, spent_today, allowed_merchants"
      )
      .eq("id", body.agentId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { success: false, approved: false, reason: "Agent not found" },
        { status: 404 }
      );
    }

    const agent = {
      id: data.id,
      name: data.name,
      balance: Number(data.balance),
      dailyLimit: Number(data.daily_limit),
      transactionLimit: Number(data.transaction_limit),
      active: data.active,
      spentToday: Number(data.spent_today),
      allowedMerchants: data.allowed_merchants ?? [],
    };

    const merchant = body.merchant.trim();

    const decision = evaluatePayment(agent, {
      agentId: agent.id,
      merchant,
      amount: body.amount,
    });

    const paymentStatus = decision.requiresApproval
      ? "Pending"
      : decision.approved
        ? "Approved"
        : "Blocked";

    const { data: paymentResult, error: paymentError } =
      await adminSupabase.rpc("process_payment_atomic", {
        p_agent_id: agent.id,
        p_merchant: merchant,
        p_amount: body.amount,
        p_status: paymentStatus,
        p_reason: decision.reason,
      });

    if (paymentError) {
      console.error("DASHBOARD PAYMENT ERROR:", paymentError);

      return NextResponse.json(
        { success: false, approved: false, reason: "Unable to process payment" },
        { status: 500 }
      );
    }

    if (!paymentResult?.success) {
      return NextResponse.json(
        {
          success: false,
          approved: false,
          reason: paymentResult?.reason ?? "Payment rejected",
        },
        { status: 400 }
      );
    }

    const { data: updatedAgent, error: agentError } =
      await adminSupabase
        .from("agents")
        .select("id, balance, spent_today")
        .eq("id", agent.id)
        .single();

    if (agentError || !updatedAgent) {
      return NextResponse.json(
        { success: false, approved: false, reason: "Unable to reload agent state" },
        { status: 500 }
      );
    }

    const transaction = paymentResult.transaction;

    return NextResponse.json({
      success: true,
      approved: transaction.status === "Approved",
      reason: transaction.reason,
      transaction,
      agent: {
        id: updatedAgent.id,
        balance: Number(updatedAgent.balance),
        spentToday: Number(updatedAgent.spent_today),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, approved: false, reason: "Invalid JSON request" },
      { status: 400 }
    );
  }
}