import { NextResponse } from "next/server";
import { evaluatePayment } from "../../../lib/paymentEngine";
import {
  findAgent,
  updateAgentAfterPayment,
} from "../../../lib/agentStore";
import { createTransaction } from "../../../lib/transactionLedger";

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
const agent = findAgent(body.agentId);
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

    const decision = evaluatePayment(agent, {
      agentId: body.agentId,
      merchant: body.merchant,
      amount: body.amount,
    });

    if (decision.approved) {
  updateAgentAfterPayment(
    agent.id,
    body.amount
  );
}

const transaction = createTransaction(
  agent.id,
  body.merchant,
  body.amount,
  decision.approved,
  decision.reason
);

    return NextResponse.json({
  success: true,
  approved: decision.approved,
  reason: decision.reason,
  payment: {
    agentId: body.agentId,
    merchant: body.merchant,
    amount: body.amount,
  },
  transaction,
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