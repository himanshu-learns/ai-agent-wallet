
import { NextResponse } from "next/server";
import { findTransaction } from "../../../lib/transactionLedger";
import { supabase } from "../../../lib/supabase";
import { findAgent } from "../../../lib/agentStore";

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

    const transaction = await findTransaction(transactionId);

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

    // Perform approval atomically in Supabase.
    const { data: approvalResult, error: approvalError } =
      await supabase.rpc("approve_transaction_atomic", {
        p_transaction_id: transaction.id,
      });

    if (approvalError) {
      console.error("ATOMIC APPROVAL ERROR:", approvalError);

      return NextResponse.json(
        {
          success: false,
          reason: "Unable to approve transaction",
        },
        { status: 500 }
      );
    }

    if (!approvalResult?.success) {
      return NextResponse.json(
        {
          success: false,
          reason:
            approvalResult?.reason ??
            "Transaction could not be approved",
        },
        { status: 400 }
      );
    }

    // Fetch fresh database state after atomic approval.
    const updatedTransaction = await findTransaction(transaction.id);
    const updatedAgent = await findAgent(agent.id);

    if (!updatedTransaction || !updatedAgent) {
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
      transaction: updatedTransaction,
      agent: {
        id: updatedAgent.id,
        balance: updatedAgent.balance,
        spentToday: updatedAgent.spentToday,
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

