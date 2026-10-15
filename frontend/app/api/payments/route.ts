import { NextResponse } from "next/server";
import { evaluatePayment } from "../../../lib/paymentEngine";
import { findAgent } from "../../../lib/agentStore";
import { supabase } from "../../../lib/supabase";


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
      typeof body.agentId !== "number" ||
      typeof body.merchant !== "string" ||
      typeof body.amount !== "number"
    ) {
      return NextResponse.json(
        {
          approved: false,
          reason: "Invalid payment request",
        },
        { status: 400 }
      );
    }

    // Temporary sandbox agent.
    // Database se agents connect karna next phase mein karenge.
const agent = await findAgent(body.agentId);
if (!agent) {
  return NextResponse.json(
    {
      success: false,
      approved: false,
      reason: "Agent not found",
    },
    { status: 404 }
  );
}

if (agent.apiKey !== apiKey) {
  return NextResponse.json(
    {
      success: false,
      approved: false,
      reason: "Invalid agent API key",
    },
    { status: 401 }
  );
}

    const decision = evaluatePayment(agent, {
      agentId: body.agentId,
      merchant: body.merchant,
      amount: body.amount,
    });


const paymentStatus = decision.requiresApproval
  ? "Pending"
  : decision.approved
    ? "Approved"
    : "Blocked";

const { data: paymentResult, error: paymentError } =
  await supabase.rpc("process_payment_atomic", {
    p_agent_id: agent.id,
    p_merchant: body.merchant,
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


const updatedAgent = await findAgent(agent.id);


    return NextResponse.json({
  success: true,
 approved: transaction.status === "Approved",
 reason: transaction.reason,
  payment: {
    agentId: body.agentId,
    merchant: body.merchant,
    amount: body.amount,
  },
  transaction,
 agent: updatedAgent
  ? {
      id: updatedAgent.id,
      balance: updatedAgent.balance,
      spentToday: updatedAgent.spentToday,
    }
  : null,
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