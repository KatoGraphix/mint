import { supabase } from "../../src/lib/supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Missing token" });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ success: false, error: "Invalid session" });

    const { bank_name, bank_account_number, existing_onboarding_id } = req.body;

    if (!bank_name || !bank_account_number) {
      return res.status(400).json({ success: false, error: "Missing bank details" });
    }

    // Validate account number format (10-11 digits)
    const accountRegex = /^\d{10,11}$/;
    if (!accountRegex.test(bank_account_number)) {
      return res.status(400).json({ success: false, error: "Invalid account number format" });
    }

    const userId = user.id;
    let onboardingId = existing_onboarding_id;

    if (!onboardingId) {
      const { data: latest } = await supabase
        .from("user_onboarding")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest?.id) onboardingId = latest.id;
    }

    const updatePayload = {
      bank_name,
      bank_account_number,
      updated_at: new Date().toISOString(),
    };

    if (onboardingId) {
      const { data: updated, error } = await supabase
        .from("user_onboarding")
        .update(updatePayload)
        .eq("id", onboardingId)
        .eq("user_id", userId)
        .select("id");

      if (error) {
        console.error("[Onboarding] Bank details update error:", error.message);
        return res.status(500).json({ success: false, error: error.message });
      }

      if (updated && updated.length > 0) {
        console.log(`[Onboarding] Bank details updated for user ${userId}`);
        return res.json({ success: true, onboarding_id: onboardingId });
      }
    }

    // If no existing record, create one
    const { data: inserted, error: insErr } = await supabase
      .from("user_onboarding")
      .insert({
        user_id: userId,
        bank_name,
        bank_account_number,
        employment_status: "not_provided",
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("[Onboarding] Bank details insert error:", insErr.message);
      return res.status(500).json({ success: false, error: insErr.message });
    }

    console.log(`[Onboarding] Bank details saved for user ${userId}`);
    res.json({ success: true, onboarding_id: inserted?.id });
  } catch (error) {
    console.error("[Onboarding] Bank details save error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}