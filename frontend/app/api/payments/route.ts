
import { NextResponse } from "next/server";
import { evaluatePayment } from "../../../lib/paymentEngine";
import { authenticateAgent } from "../../../lib/agentCredentials";
import { adminSupabase } from "../../../lib/supabase/admin";

type PaymentRequest = {
  agentId: number;
  merchant: string;
  amount: number;
};

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get("x-agent-api-key");

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          approved: false,
          reason: "Missing agent API key",
        },
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
        {
          success: false,
          approved: false,
          reason: "Invalid payment request",
        },
        { status: 400 }
      );
    }

    // Verify the agent's API key using the stored hash.
    const agent = await authenticateAgent(body.agentId, apiKey);

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          approved: false,
          reason: "Invalid agent credentials",
        },
        { status: 401 }
      );
    }

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

    // Execute payment through the trusted server-side client.
    const { data: paymentResult, error: paymentError } =
      await adminSupabase.rpc("process_payment_atomic", {
        p_agent_id: agent.id,
        p_merchant: merchant,
        p_amount: body.amount,
        p_status: paymentStatus,
        p_reason: decision.reason,
      });

    if (paymentError) {
      console.error("PROCESS PAYMENT ERROR:", paymentError);

      return NextResponse.json(
        {
          success: false,
          approved: false,
          reason: "Unable to process payment",
        },
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

    const transaction = paymentResult.transaction;

    const { data: updatedAgent, error: agentError } =
      await adminSupabase
        .from("agents")
        .select("id, balance, spent_today")
        .eq("id", agent.id)
        .single();

    if (agentError || !updatedAgent) {
      return NextResponse.json(
        {
          success: false,
          approved: false,
          reason: "Payment processed but agent state could not be reloaded",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      approved: transaction.status === "Approved",
      reason: transaction.reason,
      payment: {
        agentId: agent.id,
        merchant,
        amount: body.amount,
      },
      transaction,
      agent: {
        id: updatedAgent.id,
        balance: Number(updatedAgent.balance),
        spentToday: Number(updatedAgent.spent_today),
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        reason: "Invalid JSON request",
      },
      { status: 400 }
    );
  }
}
