import { NextResponse } from "next/server";
import { transactions } from "../../../lib/transactionLedger";

export async function GET() {
  return NextResponse.json({
    success: true,
    transactions,
  });
}