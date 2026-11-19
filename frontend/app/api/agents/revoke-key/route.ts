
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/supabase/server";
import { adminSupabase } from "../../../../lib/supabase/admin";
import { checkRateLimit } from "../../../../lib/rateLimit";

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser();

    if (!auth) {
      return NextResponse.json(
        { success: false, reason: "Unauthorized" },
        { status: 401 }
      );
    }

    const allowed = await checkRateLimit(auth.user.id);

if (!allowed) {
  return NextResponse.json(
    { success: false, reason: "Too many requests. Try again later." },
    { status: 429 }
  );
}

    const body = await request.json();
    const agentId = body.agentId;

    if (!Number.isSafeInteger(agentId) || agentId <= 0) {
      return NextResponse.json(
        { success: false, reason: "Invalid agent ID" },
        { status: 400 }
      );
    }

    const { data, error } = await adminSupabase
      .from("agents")
      .update({
        api_key_hash: null,
        api_key: null,
      })
      .eq("id", agentId)
      .eq("user_id", auth.user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { success: false, reason: "Agent not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "API key revoked successfully",
    });
  } catch {
    return NextResponse.json(
      { success: false, reason: "Invalid request" },
      { status: 400 }
    );
  }
}
