"use client";

import { useEffect, useState } from "react";
import {
  evaluatePayment,
  type PaymentRequest,
} from "../lib/paymentEngine";

import {
  createTransaction,
  type Transaction,
} from "../lib/transactionLedger";

type Agent = {
  id: number;
  name: string;
  balance: number;
  dailyLimit: number;
  transactionLimit: number;
  active: boolean;
  spentToday: number;
  apiKey: string;
};

const initialAgents: Agent[] = [
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

const initialTransactions: Transaction[] = [
  {
    id: 1,
    agentId: 1,
    merchant: "OpenAI API",
    amount: 0.15,
    status: "Approved",
    reason: "Payment approved",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    agentId: 1,
    merchant: "AWS",
    amount: 2,
    status: "Approved",
    reason: "Payment approved",
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    agentId: 1,
    merchant: "Unknown Service",
    amount: 10,
    status: "Blocked",
    reason: "Transaction limit exceeded",
    createdAt: new Date().toISOString(),
  },
];

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  useEffect(() => {
  async function loadAgents() {
    try {
      const response = await fetch("/api/agents");
      const data = await response.json();

      if (response.ok && Array.isArray(data.agents)) {
        setAgents(data.agents);

        if (data.agents.length > 0) {
          setSelectedAgentId(data.agents[0].id);
        }
      }
    } catch {
      return;
    }
  }

  loadAgents();
}, []);
  const [transactions, setTransactions] = 
  useState<Transaction[]>(initialTransactions);
  
  useEffect(() => {
  async function loadTransactions() {
    try {
      const response = await fetch("/api/transactions");
      const data = await response.json();

      if (
        response.ok &&
        Array.isArray(data.transactions)
      ) {
        setTransactions(data.transactions);
      }
    } catch {
      return;
    }
  }

  loadTransactions();
}, []);

  const [showCreateForm, setShowCreateForm] = useState(false);

  const [name, setName] = useState("");
  const [balance, setBalance] = useState("100");
  const [dailyLimit, setDailyLimit] = useState("20");
  const [transactionLimit, setTransactionLimit] = useState("5");
  const [paymentMerchant, setPaymentMerchant] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState(1);
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([
  "OpenAI API",
  "AWS",
]);

const [paymentResult, setPaymentResult] = useState<{
  approved: boolean;
  reason: string;
} | null>(null);

  const totalBalance = agents.reduce(
    (total, agent) => total + agent.balance,
    0
  );

  const totalSpending = agents.reduce(
  (total, agent) => total + agent.spentToday,
  0
  );

  const activeAgents = agents.filter((agent) => agent.active).length;

  async function createAgent() {
  if (!name.trim()) {
    return;
  }

  try {
    const response = await fetch("/api/agents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
        balance: Number(balance),
        dailyLimit: Number(dailyLimit),
        transactionLimit: Number(transactionLimit),
        allowedMerchants: selectedMerchants,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return;
    }

    setAgents((currentAgents) => [
      ...currentAgents,
      data.agent,
    ]);

    setName("");
    setBalance("100");
    setDailyLimit("20");
    setTransactionLimit("5");
    setSelectedMerchants(["OpenAI API", "AWS"]);
    setShowCreateForm(false);
  } catch {
    return;
  }
}

async function requestPayment() {
  const agent = agents.find(
    (agent) => agent.id === selectedAgentId
  );

  if (!agent) {
    return;
  }

  try {
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-api-key": agent.apiKey,
      },
      body: JSON.stringify({
        agentId: agent.id,
        merchant: paymentMerchant,
        amount: Number(paymentAmount),
      }),
    });

    const data = await response.json();

    setPaymentResult({
      approved: data.approved,
      reason: data.reason,
    });

    if (data.transaction) {
      setTransactions((currentTransactions) => [
        data.transaction,
        ...currentTransactions,
      ]);
    }
  if (data.approved && data.agent) {
  setAgents((currentAgents) =>
    currentAgents.map((currentAgent) =>
      currentAgent.id === data.agent.id
        ? {
            ...currentAgent,
            balance: data.agent.balance,
            spentToday: data.agent.spentToday,
          }
        : currentAgent
    )
  );
}
  } catch {
    setPaymentResult({
      approved: false,
      reason: "Unable to connect to payment API",
    });
  }
}

async function approvePayment(transactionId: number) {
  try {
    const response = await fetch("/api/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transactionId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
  setPaymentResult({
    approved: false,
    reason: data.reason,
  });
  return;
}

    if (data.transaction) {
      setTransactions((currentTransactions) =>
        currentTransactions.map((transaction) =>
          transaction.id === data.transaction.id
            ? data.transaction
            : transaction
        )
      );
    }

    setPaymentResult(null);

    if (data.agent) {
      setAgents((currentAgents) =>
        currentAgents.map((agent) =>
          agent.id === data.agent.id
            ? {
                ...agent,
                balance: data.agent.balance,
                spentToday: data.agent.spentToday,
              }
            : agent
        )
      );
    }
  } catch {
    return;
  }
}

async function rejectPayment(transactionId: number) {
  try {
    const response = await fetch("/api/reject", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transactionId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return;
    }

    if (data.transaction) {
      setTransactions((currentTransactions) =>
        currentTransactions.map((transaction) =>
          transaction.id === data.transaction.id
            ? data.transaction
            : transaction
        )
      );
    }
  } catch {
    return;
  }
}

  function toggleAgent(id: number) {
    setAgents((currentAgents) =>
      currentAgents.map((agent) =>
        agent.id === id
          ? { ...agent, active: !agent.active }
          : agent
      )
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Agent Wallet</h1>
            <p className="mt-1 text-sm text-slate-400">
              Financial control for autonomous AI agents
            </p>
          </div>

          <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">
            Sandbox Mode
          </div>
        </header>

        {/* Stats */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Total Balance</p>
            <p className="mt-2 text-3xl font-bold">
              ${totalBalance.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Active Agents</p>
            <p className="mt-2 text-3xl font-bold">{activeAgents}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Today's Spending</p>
            <p className="mt-2 text-3xl font-bold">
            ${totalSpending.toFixed(2)}
            </p>
          </div>
        </section>

        {/* Agents */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Agents</h2>

            <button
              onClick={() => setShowCreateForm(true)}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200"
            >
              + Create Agent
            </button>
          </div>

          {/* Create Agent Form */}
          {showCreateForm && (
            <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-lg font-semibold">Create AI Agent</h3>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-400">
                    Agent Name
                  </label>

                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Coding Agent"
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400">
                    Initial Balance
                  </label>

                  <input
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400">
                    Daily Spending Limit
                  </label>

                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400">
                    Per Transaction Limit
                  </label>

                  <input
                    type="number"
                    value={transactionLimit}
                    onChange={(e) =>
                      setTransactionLimit(e.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
  <label className="text-sm text-slate-400">
    Allowed Merchants
  </label>

  <div className="mt-3 space-y-2">
    {["OpenAI API", "AWS"].map((merchant) => (
      <label
        key={merchant}
        className="flex items-center gap-2 text-sm"
      >
        <input
          type="checkbox"
          checked={selectedMerchants.includes(merchant)}
          onChange={(event) => {
            setSelectedMerchants((current) =>
              event.target.checked
                ? [...current, merchant]
                : current.filter((item) => item !== merchant)
            );
          }}
        />

        <span>{merchant}</span>
      </label>
    ))}
  </div>
</div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={createAgent}
                  className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-200"
                >
                  Create Agent
                </button>

                <button
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Agent Cards */}
          <div className="space-y-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {agent.name}
                      </h3>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          agent.active
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {agent.active ? "● Active" : "● Paused"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-slate-500">
                          Wallet Balance
                        </p>
                        <p className="mt-1 font-medium">
                          ${agent.balance.toFixed(2)}
                        </p>
                      </div>

                      <div>
  <p className="text-slate-500">
    API Key
  </p>

  <div className="mt-1 flex items-center gap-2">
    <code className="max-w-[180px] truncate font-mono text-xs text-slate-300">
      {agent.apiKey}
    </code>

    <button
      onClick={() =>
        navigator.clipboard.writeText(agent.apiKey)
      }
      className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
    >
      Copy
    </button>
  </div>
</div>

                      <div>
                        <p className="text-slate-500">
                          Daily Limit
                        </p>
                        <p className="mt-1 font-medium">
                          ${agent.dailyLimit.toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">
                          Transaction Limit
                        </p>
                        <p className="mt-1 font-medium">
                          ${agent.transactionLimit.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleAgent(agent.id)}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                  >
                    {agent.active ? "Pause Agent" : "Activate Agent"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        {/* Payment Request */}
<section className="mt-8">
  <div className="mb-4">
    <h2 className="text-xl font-semibold">Request Payment</h2>
    <p className="mt-1 text-sm text-slate-400">
      Test how your agent wallet approves or blocks payments.
    </p>
  </div>

  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
    <div className="grid gap-4 md:grid-cols-3">
      {/* Agent */}
      <div>
        <label className="text-sm text-slate-400">
          Agent
        </label>

        <select
          value={selectedAgentId}
          onChange={(e) =>
            setSelectedAgentId(Number(e.target.value))
          }
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
        >
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      {/* Merchant */}
      <div>
        <label className="text-sm text-slate-400">
          Merchant
        </label>

        <input
          value={paymentMerchant}
          onChange={(e) =>
            setPaymentMerchant(e.target.value)
          }
          placeholder="e.g. OpenAI API"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-400"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="text-sm text-slate-400">
          Amount
        </label>

        <input
          type="number"
          step="0.01"
          min="0"
          value={paymentAmount}
          onChange={(e) =>
            setPaymentAmount(e.target.value)
          }
          placeholder="0.15"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-slate-400"
        />
      </div>
    </div>

    <button
      onClick={requestPayment}
      className="mt-5 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-200"
    >
      Request Payment
    </button>

    {/* Result */}
    {paymentResult && (
      <div
        className={`mt-5 rounded-xl border p-4 ${
          paymentResult.approved
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-red-500/30 bg-red-500/10"
        }`}
      >
        <p
          className={`font-semibold ${
            paymentResult.approved
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {paymentResult.approved
            ? "✓ PAYMENT APPROVED"
            : "✕ PAYMENT BLOCKED"}
        </p>

        <p className="mt-1 text-sm text-slate-300">
          {paymentResult.reason}
        </p>
      </div>
    )}
  </div>
</section>

        {/* Pending Approvals */}
<section className="mt-8">
  <h2 className="mb-4 text-xl font-semibold">
    Pending Approvals
  </h2>

  <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
    {transactions.filter(
      (transaction) => transaction.status === "Pending"
    ).length === 0 ? (
      <div className="p-5 text-sm text-slate-500">
        No pending approvals
      </div>
    ) : (
      transactions
        .filter((transaction) => transaction.status === "Pending")
        .map((transaction) => (
          <div
            key={transaction.id}
            className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{transaction.merchant}</p>
              <p className="text-sm text-slate-500">
                Payment request · ${transaction.amount.toFixed(2)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => approvePayment(transaction.id)}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950"
              >
                Approve
              </button>

              <button
                onClick={() => rejectPayment(transaction.id)}
                className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400"
              >
                Reject
              </button>
            </div>
          </div>
        ))
    )}
  </div>
</section>

        {/* Transactions */}
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">
            Recent Transactions
          </h2>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex flex-col gap-3 border-b border-slate-800 p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{transaction.merchant}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(transaction.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <p className="font-medium">${transaction.amount.toFixed(2)}</p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      transaction.status === "Approved"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}