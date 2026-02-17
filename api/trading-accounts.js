import { supabase, supabaseAdmin, authenticateUser } from "./_lib/supabase.js";

const CANDIDATE_TABLES = ["trading_accounts", "broker_accounts", "brokerage_accounts"];

function normalizeAccounts(accounts = []) {
  return accounts.map((account) => ({
    id: account.id,
    brokerName: account.broker_name || account.provider || account.broker || null,
    accountNumber: account.account_number || account.number || null,
    accountType: account.account_type || account.type || null,
    status: account.status || "active",
    currency: account.currency || null,
    nickname: account.nickname || null,
    lastSyncedAt: account.last_synced_at || account.updated_at || account.created_at || null,
  }));
}

async function fetchFromFirstAvailableTable(db, userId) {
  for (const table of CANDIDATE_TABLES) {
    const { data, error } = await db
      .from(table)
      .select("id, broker_name, provider, broker, account_number, number, account_type, type, status, currency, nickname, last_synced_at, updated_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error) {
      return { table, accounts: data || [] };
    }

    if (error.code === "42P01") {
      continue;
    }

    throw error;
  }

  return { table: null, accounts: [] };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: "Database not connected" });
    }

    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: authError || "Unauthorized" });
    }

    const db = supabaseAdmin || supabase;
    const { table, accounts } = await fetchFromFirstAvailableTable(db, user.id);

    return res.status(200).json({
      success: true,
      sourceTable: table,
      tradingAccounts: normalizeAccounts(accounts),
      accounts: normalizeAccounts(accounts),
    });
  } catch (error) {
    console.error("[trading-accounts] Error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to fetch trading accounts" });
  }
}
