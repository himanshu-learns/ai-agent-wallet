
import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { getAuthenticatedUser } from "../../../../lib/supabase/server";
import { adminSupabase } from "../../../../lib/supabase/admin";

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
    const agentId = body.agentId;

    if (!Number.isSafeInteger(agentId) || agentId <= 0) {
      return NextResponse.json(
        { success: false, reason: "Invalid agent ID" },
        { status: 400 }
      );
    }

    const newApiKey = randomBytes(32).toString("hex");

    const newApiKeyHash = createHash("sha256")
      .update(newApiKey)
      .digest("hex");

    const { data, error } = await adminSupabase
      .from("agents")
      .update({
        api_key_hash: newApiKeyHash,
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
      message: "API key rotated successfully",
      apiKey: newApiKey,
    });
  } catch {
    return NextResponse.json(
      { success: false, reason: "Invalid request" },
      { status: 400 }
    );
  }
}
