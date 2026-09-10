import type { Agent } from "./paymentEngine";

export const agents: Agent[] = [
  {
    id: 1,
    name: "Coding Agent",
    balance: 100,
    dailyLimit: 20,
    transactionLimit: 5,
    active: true,
    spentToday: 0,
    apiKey: "sandbox-agent-key-001",
  },
];

export function findAgent(agentId: number) {
  return agents.find((agent) => agent.id === agentId);
}

export function updateAgentAfterPayment(
  agentId: number,
  amount: number
) {
  const agent = findAgent(agentId);

  if (!agent) {
    return false;
  }

  agent.balance -= amount;
  agent.spentToday += amount;

  return true;
}