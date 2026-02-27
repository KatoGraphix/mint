import { supabaseAdmin, supabase } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Missing token" });

    const db = supabaseAdmin || supabase;
    const { data: { user }, error: authErr } = await db.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: "Invalid session" });

    const {
      bank_name,
      account_holder,
      account_number,
      branch_code,
      existing_onboarding_id,
    } = req.body || {};

    if (!bank_name || !account_holder || !account_number || !branch_code) {
      return res.status(400).json({ success: false, error: "Missing required bank details" });
    }

    let onboardingId = existing_onboarding_id;
    if (!onboardingId) {
      const { data: latest } = await db
        .from("user_onboarding")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest?.id) onboardingId = latest.id;
    }

    const bankDetails = {
      bank_name: String(bank_name).trim(),
      account_holder: String(account_holder).trim(),
      account_number: String(account_number).trim(),
      branch_code: String(branch_code).trim(),
      updated_at: new Date().toISOString(),
    };

    const { data: currentRow } = onboardingId
      ? await db.from("user_onboarding").select("sumsub_raw").eq("id", onboardingId).eq("user_id", user.id).maybeSingle()
      : await db.from("user_onboarding").select("sumsub_raw").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

    let existingRaw = {};
    if (currentRow?.sumsub_raw) {
      try {
        existingRaw = typeof currentRow.sumsub_raw === "string" ? JSON.parse(currentRow.sumsub_raw) : currentRow.sumsub_raw;
      } catch {
        existingRaw = {};
      }
    }

    existingRaw.bank_details = bankDetails;
    const mergedRaw = JSON.stringify(existingRaw);

    if (onboardingId) {
      const { error } = await db
        .from("user_onboarding")
        .update({ sumsub_raw: mergedRaw })
        .eq("id", onboardingId)
        .eq("user_id", user.id);
      if (error) return res.status(500).json({ success: false, error: error.message });
    } else {
      const { data, error } = await db
        .from("user_onboarding")
        .insert({ user_id: user.id, employment_status: "not_provided", sumsub_raw: mergedRaw })
        .select("id")
        .single();
      if (error) return res.status(500).json({ success: false, error: error.message });
      onboardingId = data?.id;
    }

    return res.json({ success: true, onboarding_id: onboardingId });
  } catch (error) {
    console.error("[Onboarding] Save bank details error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
