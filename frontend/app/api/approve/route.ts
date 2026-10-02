import { NextResponse } from "next/server";
import {
  findTransaction,
  approveTransaction,
} from "../../../lib/transactionLedger";
import {
  findAgent,
  updateAgentAfterPayment,
} from "../../../lib/agentStore";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const transactionId = Number(body.transactionId);

    if (!Number.isFinite(transactionId)) {
      return NextResponse.json(
        {
          success: false,
          reason: "Invalid transaction ID",
        },
        { status: 400 }
      );
    }

    const transaction = findTransaction(transactionId);

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          reason: "Transaction not found",
        },
        { status: 404 }
      );
    }

    if (transaction.status !== "Pending") {
      return NextResponse.json(
        {
          success: false,
          reason: "Transaction is not pending",
        },
        { status: 400 }
      );
    }

    const agent = await findAgent(transaction.agentId);

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          reason: "Agent not found",
        },
        { status: 404 }
      );
    }

    if (!agent.active) {
      return NextResponse.json(
        {
          success: false,
          reason: "Agent is inactive",
        },
        { status: 400 }
      );
    }

    if (!agent.allowedMerchants.includes(transaction.merchant)) {
      return NextResponse.json(
        {
          success: false,
          reason: "Merchant is no longer allowed",
        },
        { status: 400 }
      );
    }

    if (transaction.amount > agent.balance) {
      return NextResponse.json(
        {
          success: false,
          reason: "Insufficient wallet balance",
        },
        { status: 400 }
      );
    }

    if (
      (agent.spentToday ?? 0) + transaction.amount >
      agent.dailyLimit
    ) {
      return NextResponse.json(
        {
          success: false,
          reason: `Payment would exceed daily spending limit of $${agent.dailyLimit.toFixed(
            2
          )}`,
        },
        { status: 400 }
      );
    }

    const approved = approveTransaction(transaction.id);

    if (!approved) {
      return NextResponse.json(
        {
          success: false,
          reason: "Unable to approve transaction",
        },
        { status: 400 }
      );
    }

    const updated = await updateAgentAfterPayment(
      agent.id,
      transaction.amount
    );

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          reason: "Transaction approved but failed to update agent balance",
        },
        { status: 500 }
      );
    }

    const updatedAgent = await findAgent(agent.id);

    return NextResponse.json({
      success: true,
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