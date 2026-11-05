
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/supabase/server";

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
    const agentId = Number(body.agentId);

    if (!Number.isSafeInteger(agentId) || agentId <= 0) {
      return NextResponse.json(
        { success: false, reason: "Invalid agent ID" },
        { status: 400 }
      );
    }

    const { data: existingAgent, error: fetchError } =
      await auth.supabase
        .from("agents")
        .select("id, active")
        .eq("id", agentId)
        .eq("user_id", auth.user.id)
        .maybeSingle();

    if (fetchError || !existingAgent) {
      return NextResponse.json(
        { success: false, reason: "Agent not found" },
        { status: 404 }
      );
    }

    const { data, error } = await auth.supabase
      .from("agents")
      .update({ active: !existingAgent.active })
      .eq("id", agentId)
      .eq("user_id", auth.user.id)
      .select("id, active")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { success: false, reason: "Failed to update agent" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: data.id,
        active: data.active,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, reason: "Invalid JSON request" },
      { status: 400 }
    );
  }
}
