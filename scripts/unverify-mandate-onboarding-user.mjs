import { createClient } from "@supabase/supabase-js";

const email = (process.argv[2] || "").trim().toLowerCase();
const dryRun = process.argv.includes("--dry-run");

if (!email) {
  console.error("Usage: node scripts/unverify-mandate-onboarding-user.mjs <email> [--dry-run]");
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey);

const findUserByEmail = async (targetEmail) => {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    if (!users.length) return null;

    const match = users.find((u) => (u.email || "").toLowerCase() === targetEmail);
    if (match) return match;

    if (users.length < perPage) return null;
    page += 1;
  }
};

const user = await findUserByEmail(email);
if (!user) {
  console.error(`No auth user found for email: ${email}`);
  process.exit(1);
}

const userId = user.id;

const { data: onboardingRows, error: onboardingError } = await admin
  .from("user_onboarding")
  .select("id, kyc_status, sumsub_raw")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(1);

if (onboardingError) {
  console.error("Failed to load onboarding row:", onboardingError.message);
  process.exit(1);
}

const onboarding = onboardingRows?.[0] || null;

let nextRaw = null;
if (onboarding?.sumsub_raw) {
  const raw = typeof onboarding.sumsub_raw === "string"
    ? JSON.parse(onboarding.sumsub_raw)
    : onboarding.sumsub_raw;
  if (raw && typeof raw === "object") {
    const copy = { ...raw };
    delete copy.mandate_data;
    nextRaw = copy;
  }
}

const ops = [
  {
    label: "Update user_onboarding to pending + clear KYC verified timestamp + remove mandate_data",
    run: async () => {
      if (!onboarding?.id) return { skipped: "No onboarding row found" };
      const payload = {
        kyc_status: "pending",
        kyc_verified_at: null,
        updated_at: new Date().toISOString(),
      };
      if (nextRaw !== null) payload.sumsub_raw = nextRaw;

      const { error } = await admin
        .from("user_onboarding")
        .update(payload)
        .eq("id", onboarding.id)
        .eq("user_id", userId);
      if (error) throw error;
      return { ok: true };
    },
  },
  {
    label: "Delete user_onboarding_pack_details verification cache",
    run: async () => {
      const { error } = await admin
        .from("user_onboarding_pack_details")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;
      return { ok: true };
    },
  },
  {
    label: "Update required_actions KYC flags to unverified",
    run: async () => {
      const { error } = await admin
        .from("required_actions")
        .update({
          kyc_verified: false,
          kyc_pending: false,
          kyc_needs_resubmission: false,
        })
        .eq("user_id", userId);
      if (error) throw error;
      return { ok: true };
    },
  },
];

console.log("Target user:", { email, userId, dryRun });
console.log("Latest onboarding row:", onboarding ? { id: onboarding.id, kyc_status: onboarding.kyc_status } : null);

for (const op of ops) {
  if (dryRun) {
    console.log(`[dry-run] ${op.label}`);
    continue;
  }

  try {
    const result = await op.run();
    if (result?.skipped) {
      console.log(`[skipped] ${op.label}: ${result.skipped}`);
    } else {
      console.log(`[ok] ${op.label}`);
    }
  } catch (error) {
    console.error(`[error] ${op.label}:`, error.message || error);
    process.exit(1);
  }
}

console.log(dryRun ? "Dry run complete." : "Unverify operation complete.");
