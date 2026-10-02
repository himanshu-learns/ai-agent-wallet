import { NextResponse } from "next/server";
import { toggleAgent } from "../../../../lib/agentStore";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const agentId = Number(body.agentId);

    if (!Number.isFinite(agentId)) {
      return NextResponse.json(
        {
          success: false,
          reason: "Invalid agent ID",
        },
        { status: 400 }
      );
    }

  const agent = await toggleAgent(agentId);

if (!agent) {
  return NextResponse.json(
    {
      success: false,
      reason: "Agent not found or could not be updated",
    },
    { status: 404 }
  );
}

return NextResponse.json({
  success: true,
  agent: {
    id: agent.id,
    active: agent.active,
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