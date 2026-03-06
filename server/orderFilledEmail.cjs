const { Resend } = require("resend");

let _resend = null;
function getResend() {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

function escapeHtml(input) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatQuantity(qty) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 6 }).format(n);
}

function formatZarFromCents(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(n / 100);
}

function buildOrderFilledHtml({
  clientName,
  orderReference,
  filledAt,
  fills,
  logoUrl = "https://www.mymint.co.za/assets/mint-logo.svg",
  appUrl = "https://www.mymint.co.za",
  supportEmail = "support@mymint.co.za",
}) {
  const safeName = escapeHtml(clientName || "Mint client");
  const safeOrderRef = orderReference ? escapeHtml(orderReference) : "";
  const safeFilledAt = filledAt ? escapeHtml(filledAt) : "";
  const safeLogoUrl = escapeHtml(logoUrl);
  const safeAppUrl = escapeHtml(appUrl);
  const safeSupportEmail = escapeHtml(supportEmail);

  const normalizedFills = Array.isArray(fills) ? fills : [];
  const rows = normalizedFills
    .map((f) => {
      const asset = escapeHtml(f?.assetName || f?.assetSymbol || "Asset");
      const assetSub = f?.assetSymbol && f?.assetName && f.assetSymbol !== f.assetName
        ? `<div style="margin-top:2px;font-size:12px;color:#64748b;">${escapeHtml(f.assetSymbol)}</div>`
        : "";
      const qty = formatQuantity(f?.quantity);
      const avg = formatZarFromCents(f?.avgFillCents);
      const total = formatZarFromCents(f?.totalCents);

      return `
        <tr>
          <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;">
            <div style="font-size:14px;font-weight:700;color:#0f172a;">${asset}</div>
            ${assetSub}
          </td>
          <td align="right" style="padding:12px 10px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${escapeHtml(qty)}</td>
          <td align="right" style="padding:12px 10px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${escapeHtml(avg)}</td>
          <td align="right" style="padding:12px 10px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;font-weight:700;">${escapeHtml(total)}</td>
        </tr>`;
    })
    .join("");

  const grandTotalCents = normalizedFills.reduce((sum, f) => sum + (Number(f?.totalCents) || 0), 0);
  const grandTotal = formatZarFromCents(grandTotalCents);

  const preheader = normalizedFills.length === 1
    ? `Your order in ${normalizedFills[0]?.assetSymbol || normalizedFills[0]?.assetName || "your asset"} has been filled.`
    : `Your order has been filled.`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
<head>
  <meta content="width=device-width" name="viewport" />
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta content="IE=edge" http-equiv="X-UA-Compatible" />
  <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection" />
  <title>Order filled</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f8;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0" data-skip-in-text="true">
    ${escapeHtml(preheader)}
  </div>

  <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
    <tbody>
      <tr>
        <td>
          <div style="width: 100%; background: #f4f7f8; padding: 24px 12px; box-sizing: border-box;">
            <table role="presentation" width="100%" bgcolor="#f4f7f8" style="border-collapse: collapse; background: #f4f7f8;">
              <tbody>
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" bgcolor="#ffffff" style="border-collapse: collapse; width: 100%; max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0;">
                      <tbody>
                        <tr>
                          <td bgcolor="#2a0f5e" style="background: linear-gradient(135deg, #140a2e 0%, #2a0f5e 55%, #4a1d96 100%); padding: 28px; color: #ffffff;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                              <tr>
                                <td align="left" valign="middle">
                                  <img src="${safeLogoUrl}" width="110" alt="Mint" style="display:block;border:0;outline:none;text-decoration:none;height:auto;" />
                                </td>
                                <td align="right" valign="middle">
                                  <div style="font-size: 12px; letter-spacing: 0.14em; font-weight: 700; text-transform: uppercase; color: #e9d5ff;">
                                    Trade confirmation
                                  </div>
                                </td>
                              </tr>
                            </table>

                            <h1 style="font-size: 30px; line-height: 1.2; margin: 18px 0 8px; font-weight: 800; color: #ffffff;">
                              Order filled
                            </h1>
                            <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #f3e8ff;">
                              Your order has been executed and confirmed.
                              ${safeOrderRef ? `Order reference: <strong>${safeOrderRef}</strong>.` : ""}
                              ${safeFilledAt ? `Filled at: <strong>${safeFilledAt}</strong>.` : ""}
                            </p>
                          </td>
                        </tr>

                        <tr>
                          <td bgcolor="#ffffff" style="padding: 28px; background: #ffffff;">
                            <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.7; color: #1e293b;">
                              Dear ${safeName},
                            </p>

                            <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.7; color: #1e293b;">
                              Below is a summary of your filled order:
                            </p>

                            <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                                <thead>
                                  <tr style="background:#f8fafc;">
                                    <th align="left" style="padding:12px 10px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#475569;border-bottom:1px solid #e2e8f0;">Asset</th>
                                    <th align="right" style="padding:12px 10px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#475569;border-bottom:1px solid #e2e8f0;">Quantity</th>
                                    <th align="right" style="padding:12px 10px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#475569;border-bottom:1px solid #e2e8f0;">Avg fill</th>
                                    <th align="right" style="padding:12px 10px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#475569;border-bottom:1px solid #e2e8f0;">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${rows || `
                                    <tr>
                                      <td colspan="4" style="padding:14px 10px;font-size:14px;color:#64748b;">
                                        No fill details were provided.
                                      </td>
                                    </tr>
                                  `}
                                  <tr style="background:#ffffff;">
                                    <td colspan="3" align="right" style="padding:14px 10px;font-size:14px;color:#0f172a;font-weight:800;border-top:1px solid #e2e8f0;">
                                      Total cost
                                    </td>
                                    <td align="right" style="padding:14px 10px;font-size:14px;color:#0f172a;font-weight:900;border-top:1px solid #e2e8f0;">
                                      ${escapeHtml(grandTotal)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            <div style="margin-top: 18px;">
                              <a href="${safeAppUrl}" style="background:#6D28FF;border-radius:14px;color:#FFFFFF;display:inline-block;font-size:14px;font-weight:800;line-height:16px;padding:12px 16px;text-decoration:none;">
                                View in Mint
                              </a>
                            </div>

                            <p style="margin: 18px 0 0; font-size: 13px; line-height: 1.7; color: #475569;">
                              If you have any questions, reply to this email or contact us at
                              <a href="mailto:${safeSupportEmail}" style="color:#6D28FF;text-decoration:none;font-weight:800;">${safeSupportEmail}</a>.
                            </p>

                            <p style="margin: 14px 0 0; font-size: 13px; color: #0f172a; font-weight: 700;">
                              Warm regards,<br />The Mint Team
                            </p>
                          </td>
                        </tr>

                        <tr>
                          <td bgcolor="#ffffff" style="border-top: 1px solid #e2e8f0; padding: 20px 28px 26px; font-size: 12px; line-height: 1.6; color: #64748b; background: #ffffff;">
                            This communication is for informational purposes and does not constitute personal financial advice. Execution prices may reflect market conditions at the time of fill.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}

async function sendOrderFilledEmail({
  to,
  clientName,
  orderReference,
  filledAt,
  fills,
  subject,
  from,
  logoUrl,
  appUrl,
  supportEmail,
}) {
  const html = buildOrderFilledHtml({
    clientName,
    orderReference,
    filledAt,
    fills,
    logoUrl,
    appUrl,
    supportEmail,
  });

  const effectiveFrom = from || process.env.RESEND_FROM || "Mint <mornings@mymint.co.za>";
  const effectiveSubject = subject || "Order filled";

  return await getResend().emails.send({
    from: effectiveFrom,
    to: Array.isArray(to) ? to : [to],
    subject: effectiveSubject,
    html,
  });
}

async function sendOrderFilledEmailForHolding({
  supabaseAdmin,
  db,
  holdingId,
  executionPrice,
  executionQuantity,
  orderReference,
}) {
  if (!process.env.RESEND_API_KEY) return { skipped: true, reason: "RESEND_API_KEY not set" };
  if (!supabaseAdmin) return { skipped: true, reason: "Supabase admin client not available" };
  if (!db) return { skipped: true, reason: "No database connection" };
  if (!holdingId) return { skipped: true, reason: "holdingId required" };

  const { data: holding, error: holdingErr } = await db
    .from("stock_holdings")
    .select("id, user_id, security_id, quantity, avg_fill, market_value, settlement_status")
    .eq("id", holdingId)
    .maybeSingle();

  if (holdingErr || !holding) return { skipped: true, reason: holdingErr?.message || "Holding not found" };

  const userId = holding.user_id;
  const securityId = holding.security_id;

  const [{ data: profile }, { data: sec }] = await Promise.all([
    db.from("profiles").select("first_name, last_name").eq("id", userId).maybeSingle(),
    db.from("securities").select("symbol, name").eq("id", securityId).maybeSingle(),
  ]);

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const { data: userResp, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userErr || !userResp?.user?.email) return { skipped: true, reason: userErr?.message || "User email not found" };
  const email = userResp.user.email;

  const avgFillCents = Number.isFinite(Number(executionPrice))
    ? Math.round(Number(executionPrice) * 100)
    : Number(holding.avg_fill || 0);

  const qty = Number.isFinite(Number(executionQuantity))
    ? Number(executionQuantity)
    : Number(holding.quantity || 0);

  const totalCents = Math.round(qty * avgFillCents);

  const assetSymbol = sec?.symbol || "";
  const assetName = sec?.name || assetSymbol || "Asset";

  const filledAt = new Date().toISOString();

  const fills = [{
    assetName,
    assetSymbol,
    quantity: qty,
    avgFillCents,
    totalCents,
  }];

  const subject = `Order filled — ${assetSymbol || assetName}`;

  const resendResp = await sendOrderFilledEmail({
    to: email,
    clientName: fullName || userResp.user.user_metadata?.full_name || userResp.user.user_metadata?.name || "Mint client",
    orderReference,
    filledAt,
    fills,
    subject,
  });

  return { success: true, to: email, holdingId, subject, resendResp };
}

module.exports = {
  buildOrderFilledHtml,
  sendOrderFilledEmail,
  sendOrderFilledEmailForHolding,
  formatZarFromCents,
};

