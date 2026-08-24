"use client";

import { useState } from "react";

const transactions = [
  {
    merchant: "OpenAI API",
    amount: "$0.15",
    status: "Approved",
    time: "2 min ago",
  },
  {
    merchant: "AWS",
    amount: "$2.00",
    status: "Approved",
    time: "18 min ago",
  },
  {
    merchant: "Unknown Service",
    amount: "$10.00",
    status: "Blocked",
    time: "32 min ago",
  },
];

export default function Home() {
  const [agentActive, setAgentActive] = useState(true);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
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
            <p className="mt-2 text-3xl font-bold">$100.00</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Active Agents</p>
            <p className="mt-2 text-3xl font-bold">1</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Today's Spending</p>
            <p className="mt-2 text-3xl font-bold">$2.15</p>
          </div>
        </section>

        {/* Agent */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Agents</h2>

            <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200">
              + Create Agent
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">Coding Agent</h3>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      agentActive
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {agentActive ? "● Active" : "● Paused"}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-slate-500">Wallet Balance</p>
                    <p className="mt-1 font-medium">$100.00</p>
                  </div>

                  <div>
                    <p className="text-slate-500">Daily Limit</p>
                    <p className="mt-1 font-medium">$20.00</p>
                  </div>

                  <div>
                    <p className="text-slate-500">Transaction Limit</p>
                    <p className="mt-1 font-medium">$5.00</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setAgentActive(!agentActive)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
              >
                {agentActive ? "Pause Agent" : "Activate Agent"}
              </button>
            </div>
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
                key={`${transaction.merchant}-${transaction.time}`}
                className="flex flex-col gap-3 border-b border-slate-800 p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{transaction.merchant}</p>
                  <p className="text-sm text-slate-500">
                    {transaction.time}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <p className="font-medium">{transaction.amount}</p>

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
