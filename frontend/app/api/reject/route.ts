import { NextResponse } from "next/server";
import { findTransaction, rejectTransaction } from "../../../lib/transactionLedger";

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

    const rejected = await rejectTransaction(transaction.id);

    if (!rejected) {
      return NextResponse.json(
        {
          success: false,
          reason: "Unable to reject transaction",
        },
        { status: 400 }
      );
    }

    const updatedTransaction = await findTransaction(transaction.id);

if (!updatedTransaction) {
  return NextResponse.json(
    {
      success: false,
      reason: "Transaction could not be reloaded",
    },
    { status: 500 }
  );
}

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
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