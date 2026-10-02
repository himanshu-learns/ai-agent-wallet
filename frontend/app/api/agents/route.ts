import { NextResponse } from "next/server";
import { createAgent } from "../../../lib/agentStore";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          reason: error.message,
        },
        { status: 500 }
      );
    }

    const agents = data.map((agent) => ({
      id: agent.id,
      name: agent.name,
      balance: Number(agent.balance),
      dailyLimit: Number(agent.daily_limit),
      transactionLimit: Number(agent.transaction_limit),
      active: agent.active,
      spentToday: Number(agent.spent_today),
      apiKey: agent.api_key,
      allowedMerchants: agent.allowed_merchants ?? [],
    }));

    return NextResponse.json({
      success: true,
      agents,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        reason: "Failed to fetch agents",
      },
      { status: 500 }
    );
  }
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

    const agent = await createAgent(
      name.trim(),
      balance,
      dailyLimit,
      transactionLimit,
      allowedMerchants
    );

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          reason: "Failed to create agent",
        },
        { status: 500 }
      );
    }

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