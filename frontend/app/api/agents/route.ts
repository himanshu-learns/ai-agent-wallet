import { NextResponse } from "next/server";
import { agents } from "../../../lib/agentStore";

export async function GET() {
  return NextResponse.json({
    success: true,
    agents,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

  const {
  name,
  balance,
  dailyLimit,
  transactionLimit,
  allowedMerchants,
} = body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof balance !== "number" ||
      typeof dailyLimit !== "number" ||
      typeof transactionLimit !== "number" ||
      !Array.isArray(allowedMerchants)
    ) {
      return NextResponse.json(
        {
          success: false,
          reason: "Invalid agent data",
        },
        { status: 400 }
      );
    }

    const agent = createAgent(
      name.trim(),
      balance,
      dailyLimit,
      transactionLimit,
      allowedMerchants
    );

    return NextResponse.json({
      success: true,
      agent,
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