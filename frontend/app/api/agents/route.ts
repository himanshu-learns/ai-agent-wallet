
import { NextResponse } from "next/server";
import { createAgent } from "../../../lib/agentStore";
import { getAuthenticatedUser } from "../../../lib/supabase/server";
import { adminSupabase } from "../../../lib/supabase/admin";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();

    if (!auth) {
      return NextResponse.json(
        { success: false, reason: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data, error } = await auth.supabase
      .from("agents")
      .select(
        "id, name, balance, daily_limit, transaction_limit, active, spent_today, allowed_merchants"
      )
      .eq("user_id", auth.user.id)
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, reason: "Failed to fetch agents" },
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
      allowedMerchants: agent.allowed_merchants ?? [],
    }));

    return NextResponse.json({ success: true, agents });
  } catch {
    return NextResponse.json(
      { success: false, reason: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser();

    if (!auth) {
      return NextResponse.json(
        { success: false, reason: "Unauthorized" },
        { status: 401 }
      );
    }

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
      !Number.isFinite(balance) ||
      balance < 0 ||
      !Number.isFinite(dailyLimit) ||
      dailyLimit < 0 ||
      !Number.isFinite(transactionLimit) ||
      transactionLimit < 0 ||
      !Array.isArray(allowedMerchants) ||
      !allowedMerchants.every(
        (merchant: unknown) =>
          typeof merchant === "string" && merchant.trim().length > 0
      )
    ) {
      return NextResponse.json(
        { success: false, reason: "Invalid agent data" },
        { status: 400 }
      );
    }

    const result = await createAgent(
      adminSupabase,
      auth.user.id,
      name.trim(),
      balance,
      dailyLimit,
      transactionLimit,
      allowedMerchants.map((merchant: string) => merchant.trim())
    );

    if (!result) {
      return NextResponse.json(
        { success: false, reason: "Failed to create agent" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: result.agent,
      apiKey: result.apiKey,
    });
  } catch {
    return NextResponse.json(
      { success: false, reason: "Invalid JSON request" },
      { status: 400 }
    );
  }
}
