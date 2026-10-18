import { NextResponse } from "next/server";
import { findTransaction } from "../../../lib/transactionLedger";
import { supabase } from "../../../lib/supabase";
import { findAgent } from "../../../lib/agentStore";

export async function POST(request: Request) {
  try {
    let body: { transactionId?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          reason: "Invalid JSON request",
        },
        { status: 400 },
      );
    }

    const transactionId = body.transactionId;

    if (
      typeof transactionId !== "number" ||
      !Number.isSafeInteger(transactionId) ||
      transactionId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          reason: "Invalid transaction ID",
        },
        { status: 400 },
      );
    }

    const transaction = await findTransaction(transactionId);

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          reason: "Transaction not found",
        },
        { status: 404 },
      );
    }

    if (transaction.status !== "Pending") {
      return NextResponse.json(
        {
          success: false,
          reason: "Transaction is not pending",
        },
        { status: 400 },
      );
    }

    // Perform approval atomically in Supabase.
    const { data: approvalResult, error: approvalError } = await supabase.rpc(
      "approve_transaction_atomic",
      {
        p_transaction_id: transaction.id,
      },
    );

    if (approvalError) {
      console.error("ATOMIC APPROVAL ERROR:", approvalError);

      return NextResponse.json(
        {
          success: false,
          reason: "Unable to approve transaction",
        },
        { status: 500 },
      );
    }

    if (!approvalResult?.success) {
      return NextResponse.json(
        {
          success: false,
          reason: approvalResult?.reason ?? "Transaction could not be approved",
        },
        { status: 400 },
      );
    }

    // Fetch fresh database state after atomic approval.
    const updatedTransaction = await findTransaction(transaction.id);
    const updatedAgent = await findAgent(transaction.agentId);

    if (!updatedTransaction || !updatedAgent) {
      return NextResponse.json(
        {
          success: false,
          reason: "Approved transaction could not be reloaded",
        },
        { status: 500 },
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
  } catch (error) {
    console.error("APPROVE API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        reason: "Unable to process approval request",
      },
      { status: 500 },
    );
  }
}
