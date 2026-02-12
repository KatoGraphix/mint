import React, { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, MoreHorizontal, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useProfile } from "../lib/useProfile";
import NotificationBell from "../components/NotificationBell";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/formatCurrency";

const sampleRows = [
  {
    type: "Strategy",
    icon: "📊",
    title: "Q1 2026 Strategy",
    desc: "Quarterly investment planning",
    date: "Jan 15, 2026",
    amount: "R250,000",
    meta: "Allocated",
    time: "11:30",
    flow: "out",
  },
  {
    type: "Holdings",
    icon: null,
    logoUrl: "https://s3-symbol-logo.tradingview.com/capitec-bank-hldgs-ltd--big.svg",
    title: "Capitec Bank Holdings Limited",
    desc: "CPI.JO",
    instrument: "Capitec",
    ticker: "CPT",
    quantity: "120",
    avgCost: "R1,425.00",
    marketPrice: "R1,560.00",
    marketValue: "R187,200",
    unrealizedPL: "+R16,200",
    date: "Feb 01, 2026",
    amount: "R485,200",
    meta: "Market value",
    time: "09:12",
    flow: "in",
  },
  {
    type: "Reports",
    icon: "📄",
    title: "Contribution",
    desc: "Monthly savings contribution",
    date: "Dec 31, 2025",
    amount: "R1,200",
    meta: "Contribution",
    time: "16:45",
    flow: "in",
  },
  {
    type: "Strategy",
    icon: "⚠️",
    title: "Portfolio Risk Analysis",
    desc: "Volatility and exposure review",
    date: "Jan 28, 2026",
    amount: "Medium",
    meta: "Risk level",
    time: "13:05",
    flow: "out",
  },
  {
    type: "Holdings",
    icon: null,
    logoUrl: "https://s3-symbol-logo.tradingview.com/advtech-ltd--big.svg",
    title: "ADvTECH Limited",
    desc: "ADH.JO",
    instrument: "ADvTECH",
    ticker: "ADH",
    quantity: "260",
    avgCost: "R28.50",
    marketPrice: "R30.10",
    marketValue: "R7,826",
    unrealizedPL: "+R416",
    date: "Jan 20, 2026",
    amount: "R320,000",
    meta: "Par value",
    time: "10:18",
    flow: "in",
  },
  {
    type: "Reports",
    icon: "📋",
    title: "Withdrawal",
    desc: "Funds transfer to bank",
    date: "Jan 31, 2026",
    amount: "R4,500",
    meta: "Withdrawal",
    time: "15:22",
    flow: "out",
  },
  {
    type: "Strategy",
    icon: "🎯",
    title: "Q2 2026 Growth Strategy",
    desc: "Aggressive growth allocation plan",
    date: "Feb 05, 2026",
    amount: "R380,000",
    meta: "Allocated",
    time: "11:30",
    flow: "out",
  },
  {
    type: "Strategy",
    icon: "🔄",
    title: "Portfolio Rebalancing",
    desc: "Asset allocation adjustment",
    date: "Jan 22, 2026",
    amount: "R145,500",
    meta: "Reallocated",
    time: "08:50",
    flow: "out",
  },
  {
    type: "Strategy",
    icon: "💡",
    title: "Income Generation Strategy",
    desc: "Dividend-focused portfolio plan",
    date: "Jan 10, 2026",
    amount: "R220,000",
    meta: "Invested",
    time: "14:10",
    flow: "out",
  },
  {
    type: "Strategy",
    icon: "🛡️",
    title: "Conservative Strategy",
    desc: "Low-risk balanced portfolio",
    date: "Dec 28, 2025",
    amount: "R95,000",
    meta: "Allocated",
    time: "12:40",
    flow: "out",
  },
];

const StatementsPage = ({ onOpenNotifications }) => {
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState("strategy");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(9);
  const [selectedCard, setSelectedCard] = useState(null);
  const [holdingsRows, setHoldingsRows] = useState([]);
  const [holdingsRaw, setHoldingsRaw] = useState([]);

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    const calculatePerPage = () => {
      const viewportHeight = window.innerHeight;
      const availableHeight = viewportHeight - 380;
      const cardHeight = 50;
      const calculatedPerPage = Math.max(4, Math.floor(availableHeight / cardHeight));
      setPerPage(calculatedPerPage);
    };

    calculatePerPage();
    window.addEventListener("resize", calculatePerPage);
    return () => window.removeEventListener("resize", calculatePerPage);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadHoldings = async () => {
      if (!supabase || !profile?.id) return;

      try {
        const { data: holdings, error } = await supabase
          .from("stock_holdings")
          .select("id, user_id, security_id, quantity, avg_fill, market_value, unrealized_pnl, as_of_date, created_at, updated_at, Status")
          .eq("user_id", profile.id);

        if (error) throw error;
        if (!holdings || holdings.length === 0) {
          if (isMounted) setHoldingsRows([]);
          return;
        }

        const securityIds = [...new Set(holdings.map((holding) => holding.security_id).filter(Boolean))];
        let securities = [];

        if (securityIds.length > 0) {
          const { data: securityRows, error: securitiesError } = await supabase
            .from("securities")
            .select("id, symbol, exchange, name, logo_url, last_price")
            .in("id", securityIds);

          if (securitiesError) throw securitiesError;
          securities = securityRows || [];
        }

        const securitiesById = new Map(securities.map((security) => [security.id, security]));

        const mappedHoldings = holdings.map((holding) => {
          const security = securitiesById.get(holding.security_id);
          const symbol = security?.symbol || "—";
          const exchange = security?.exchange || "";
          const title = security?.name || symbol;
          const asOfValue = holding.as_of_date || holding.updated_at || holding.created_at;
          const asOfDate = asOfValue ? new Date(asOfValue) : null;
          const dateLabel = asOfDate
            ? asOfDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
            : "—";
          const timeLabel = asOfDate
            ? asOfDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
            : "—";
          const quantity = Number(holding.quantity);
          const avgFill = Number(holding.avg_fill);
          const lastPrice = Number(security?.last_price);
          const marketPriceValue = Number.isFinite(lastPrice) ? lastPrice * 100 : NaN;
          const marketValue = Number.isFinite(marketPriceValue) && Number.isFinite(quantity)
            ? marketPriceValue * quantity
            : NaN;
          const formattedQty = Number.isFinite(quantity)
            ? quantity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 6 })
            : "—";
          const formattedAvg = Number.isFinite(avgFill) ? formatCurrency(avgFill) : "—";
          const formattedPrice = Number.isFinite(marketPriceValue) ? formatCurrency(marketPriceValue) : "—";
          const formattedValue = Number.isFinite(marketValue) ? formatCurrency(marketValue) : "—";
          const computedUnrealized = Number.isFinite(marketPriceValue) && Number.isFinite(avgFill) && Number.isFinite(quantity)
            ? (marketPriceValue - avgFill) * quantity
            : NaN;
          const formattedPnl = Number.isFinite(computedUnrealized)
            ? `${computedUnrealized < 0 ? "-" : "+"}${formatCurrency(Math.abs(computedUnrealized))}`
            : "—";

          return {
            type: "Holdings",
            icon: null,
            logoUrl: security?.logo_url || null,
            title,
            desc: exchange ? `${symbol} · ${exchange}` : symbol,
            instrument: title,
            ticker: symbol,
            quantity: formattedQty,
            avgCost: formattedAvg,
            marketPrice: formattedPrice,
            marketValue: formattedValue,
            unrealizedPL: formattedPnl,
            date: dateLabel,
            amount: formattedValue,
            meta: "Market value",
            time: timeLabel,
            flow: "in",
            status: holding.Status || null,
          };
        });

        if (isMounted) {
          setHoldingsRows(mappedHoldings);
          setHoldingsRaw(
            holdings.map((holding) => ({
              id: holding.id,
              quantity: Number(holding.quantity),
              marketValue: Number(holding.market_value),
              lastPrice: Number(securitiesById.get(holding.security_id)?.last_price),
            })),
          );
        }
      } catch (error) {
        console.error("Failed to load stock holdings", error);
      }
    };

    loadHoldings();

    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    const updateMarketValues = async () => {
      if (!supabase || activeTab !== "holdings" || holdingsRaw.length === 0) return;

      const updates = holdingsRaw
        .map((holding) => {
          if (!Number.isFinite(holding.quantity) || !Number.isFinite(holding.lastPrice)) return null;
          const computedValue = holding.lastPrice * holding.quantity;
          if (!Number.isFinite(computedValue)) return null;
          const existingValue = Number.isFinite(holding.marketValue) ? holding.marketValue : null;
          const needsUpdate = existingValue == null || Math.abs(existingValue - computedValue) > 0.01;
          if (!needsUpdate) return null;
          return { id: holding.id, market_value: computedValue };
        })
        .filter(Boolean);

      if (updates.length === 0) return;

      try {
        await Promise.all(
          updates.map((update) =>
            supabase.from("stock_holdings").update({ market_value: update.market_value }).eq("id", update.id),
          ),
        );
      } catch (error) {
        console.error("Failed to update market values", error);
      }
    };

    updateMarketValues();
  }, [activeTab, holdingsRaw]);

  const baseRows = sampleRows.filter((row) => row.type !== "Holdings");
  const fallbackHoldings = sampleRows.filter((row) => row.type === "Holdings");
  const combinedRows = [...baseRows, ...(holdingsRows.length > 0 ? holdingsRows : fallbackHoldings)];

  const filtered = combinedRows.filter((row) => {
    if (activeTab === "strategy") return row.type === "Strategy" || row.type === "Holdings";
    if (activeTab === "holdings") return row.type === "Holdings";
    if (activeTab === "financials") return row.type === "Reports";
    return true;
  });

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const start = (page - 1) * perPage;
  const pageRows = filtered.slice(start, start + perPage);

  const strategyDetails = selectedCard
    ? {
        strategyName: selectedCard.strategyName || "MINT SA Defensive income",
        allocation: selectedCard.allocation || "38%",
        capitalInvested: selectedCard.capitalInvested || "R320,000.00",
        currentValue: selectedCard.currentValue || "R345,800.00",
        unrealisedPL: selectedCard.unrealisedPL || "R25,800.00",
        realisedPL: selectedCard.realisedPL || "R4,200.00",
        totalPL: selectedCard.totalPL || "R30,000.00",
      }
    : null;

  const handleDownloadPdf = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const rows = filtered.map((row) => [row.title, row.date, row.amount, row.time]);
    const pageHeight = doc.internal.pageSize.getHeight();
    const ensurePageSpace = (startY, minSpace = 120) => {
      if (startY + minSpace > pageHeight - 40) {
        doc.addPage();
        return 40;
      }
      return startY;
    };

    try {
      const response = await fetch("/assets/mint-logo.svg");
      if (response.ok) {
        const svgText = await response.text();
        const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          doc.addImage(dataUrl, "PNG", 32, 24, 60, 28);
        }
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      // Ignore logo failures and still download the PDF.
    }

    doc.setFont("times", "normal");
    doc.setFontSize(18);
    doc.text("MINT CLIENT ACCOUNT STATEMENT", 32, 86, { align: "left" });

    doc.setFontSize(12);
    doc.text("Statement Period: [Start Date] – [End Date]", 32, 112, { align: "left" });
    doc.text(`Client Name: ${displayName || "[Full Legal Name]"}`, 32, 130, { align: "left" });
    doc.text(`Client ID: ${profile?.idNumber || "[Internal ID]"}`, 32, 148, { align: "left" });
    doc.text("Account Number: [Platform Account Reference]", 32, 166, { align: "left" });
    doc.text("Custodian: [Bank X]", 32, 184, { align: "left" });
    doc.text(`Statement Date: ${new Date().toLocaleDateString("en-GB")}`, 32, 202, { align: "left" });
    doc.text("Base Currency: ZAR", 32, 220, { align: "left" });

    doc.setFontSize(18);
    doc.text("SECTION 1: ACCOUNT SUMMARY (TOP OF STATEMENT)", 32, 264, { align: "left" });

    autoTable(doc, {
      head: [["Metric", "Amount (ZAR)"]],
      body: [
        ["Opening Balance", "xxx,xxx.xx"],
        ["Total Contributions", "xxx,xxx.xx"],
        ["Total Withdrawals", "(xx,xxx.xx)"],
        ["Net Cash Flow", "xxx,xxx.xx"],
        ["Investment Market Value", "xxx,xxx.xx"],
        ["Cash Balance", "xx,xxx.xx"],
        ["Total Account Value", "xxx,xxx.xx"],
        ["Total Platform P/L", "+ / – xx,xxx.xx"],
        ["Total Platform P/L (%)", "+ / – x.xx%"],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 300 },
        1: { cellWidth: 200, halign: "right" },
      },
      margin: { top: 288, left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const notesStartY = (doc.lastAutoTable?.finalY || 320) + 20;
    doc.setFontSize(12);
    doc.text("Notes:", 32, notesStartY, { align: "left" });
    const notesLines = [
      "• \"Total Platform P/L\" reflects aggregate realised and unrealised performance across all strategies and self-directed activity on the platform.",
      "• Cash balances may be allocated or temporarily unallocated depending on strategy rebalancing cycles.",
    ];
    doc.text(notesLines, 32, notesStartY + 16, {
      align: "left",
      maxWidth: 530,
    });

    const section2StartY = ensurePageSpace(notesStartY + 100, 140);
    doc.setFontSize(18);
    doc.text("SECTION 2: STRATEGY EXPOSURE & PERFORMANCE", 32, section2StartY, { align: "left" });

    autoTable(doc, {
      head: [["Strategy Name", "Allocation (%)", "Capital Invested", "Current Value", "Unrealised P/L", "Realised P/L", "Total P/L"]],
      body: [
        ["MINT SA\nDefensive Income\nCompounders", "xx%", "xxx,xxx.xx", "xxx,xxx.xx", "xx,xxx.xx", "x,xxx.xx", "xx,xxx.xx"],
        ["MINT Cash\nAllocation", "xx%", "xx,xxx.xx", "xx,xxx.xx", "–", "–", "–"],
        ["Self-Directed\nPortfolio", "xx%", "xx,xxx.xx", "xx,xxx.xx", "x,xxx.xx", "x,xxx.xx", "xx,xxx.xx"],
        ["Total", "100%", "xxx,xxx.xx", "xxx,xxx.xx", "xx,xxx.xx", "x,xxx.xx", "xx,xxx.xx"],
      ],
      styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak" },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      pageBreak: "auto",
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 65, halign: "right" },
        2: { cellWidth: 80, halign: "right" },
        3: { cellWidth: 80, halign: "right" },
        4: { cellWidth: 80, halign: "right" },
        5: { cellWidth: 70, halign: "right" },
        6: { cellWidth: 70, halign: "right" },
      },
      startY: section2StartY + 24,
      margin: { left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const section2NotesY = (doc.lastAutoTable?.finalY || section2StartY + 100) + 20;
    doc.setFontSize(12);
    doc.text("Notes:", 32, section2NotesY, { align: "left" });
    const section2Notes = [
      "• Strategies may temporarily hold cash as part of portfolio construction, rebalancing, or risk management.",
      "• Strategy allocations are indicative as at statement date and may change without prior notice.",
    ];
    doc.text(section2Notes, 32, section2NotesY + 16, {
      align: "left",
      maxWidth: 530,
    });

    const section3StartY = ensurePageSpace(section2NotesY + 70, 120);
    doc.setFontSize(18);
    doc.text("SECTION 3: HOLDINGS SUMMARY", 32, section3StartY, { align: "left" });

    const holdingsForPdf = (holdingsRows.length > 0 ? holdingsRows : fallbackHoldings).filter(
      (row) => row.type === "Holdings",
    );
    const holdingsTableRows = holdingsForPdf.map((row) => [
      row.instrument || row.title || "—",
      row.ticker || "—",
      row.quantity || "—",
      row.avgCost || "—",
      row.marketPrice || "—",
      row.marketValue || "—",
      row.unrealizedPL || "—",
    ]);
    const fallbackHoldingsRows = [
      ["Standard Bank Group Ltd", "SBK", "xxx", "xx.xx", "xx.xx", "xxx,xxx.xx", "xx,xxx.xx"],
      ["Vodacom Group Ltd", "VOD", "xxx", "xx.xx", "xx.xx", "xxx,xxx.xx", "xx,xxx.xx"],
      ["Cash", "–", "–", "–", "–", "xx,xxx.xx", "–"],
    ];

    autoTable(doc, {
      head: [["Instrument", "Ticker", "Quantity", "Avg Cost", "Market Price", "Market Value", "Unrealised P/L"]],
      body: holdingsTableRows.length > 0 ? holdingsTableRows : fallbackHoldingsRows,
      styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak" },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      pageBreak: "auto",
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 50, halign: "center" },
        2: { cellWidth: 60, halign: "right" },
        3: { cellWidth: 60, halign: "right" },
        4: { cellWidth: 70, halign: "right" },
        5: { cellWidth: 85, halign: "right" },
        6: { cellWidth: 85, halign: "right" },
      },
      startY: section3StartY + 24,
      margin: { left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const section4StartY = ensurePageSpace((doc.lastAutoTable?.finalY || section3StartY + 120) + 40, 140);
    doc.setFontSize(18);
    doc.text("SECTION 4: FULL TRANSACTION HISTORY", 32, section4StartY, { align: "left" });
    doc.setFontSize(12);
    doc.text("(ALL activity: strategy trades + self-directed trades + cash movements)", 32, section4StartY + 18, {
      align: "left",
    });

    autoTable(doc, {
      head: [[
        "Date",
        "Transaction Type",
        "Strategy / Source",
        "Instrument",
        "Buy / Sell",
        "Quantity",
        "Price",
        "Gross Amount",
        "Fees",
        "Net Amount",
      ]],
      body: [
        ["dd/mm/yyyy", "Strategy Trade", "MINT SA Defensive Income", "SBK", "Buy", "xxx", "xx.xx", "xx,xxx.xx", "xxx.xx", "xx,xxx.xx"],
        ["dd/mm/yyyy", "Self Trade", "Client Initiated", "VOD", "Sell", "xxx", "xx.xx", "xx,xxx.xx", "xxx.xx", "xx,xxx.xx"],
        ["dd/mm/yyyy", "Dividend", "Strategy Allocation", "SBK", "–", "–", "–", "x,xxx.xx", "–", "x,xxx.xx"],
        ["dd/mm/yyyy", "Fee", "Platform Fee", "–", "–", "–", "–", "(xxx.xx)", "–", "(xxx.xx)"],
      ],
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      pageBreak: "auto",
      rowPageBreak: "auto",
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 70 },
        2: { cellWidth: 85 },
        3: { cellWidth: 45 },
        4: { cellWidth: 45 },
        5: { cellWidth: 40, halign: "right" },
        6: { cellWidth: 40, halign: "right" },
        7: { cellWidth: 55, halign: "right" },
        8: { cellWidth: 45, halign: "right" },
        9: { cellWidth: 55, halign: "right" },
      },
      startY: section4StartY + 32,
      margin: { left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const section4NotesY = (doc.lastAutoTable?.finalY || section4StartY + 160) + 20;
    doc.setFontSize(12);
    doc.text("Notes:", 32, section4NotesY, { align: "left" });
    const section4Notes = [
      "• Transaction source distinguishes between strategy-driven activity and client-initiated trades.",
      "• All fees are disclosed on a gross and net basis.",
    ];
    doc.text(section4Notes, 32, section4NotesY + 16, {
      align: "left",
      maxWidth: 530,
    });

    const section5StartY = ensurePageSpace(section4NotesY + 70, 120);
    doc.setFontSize(18);
    doc.text("SECTION 5: FEES & CHARGES SUMMARY", 32, section5StartY, { align: "left" });

    autoTable(doc, {
      head: [["Fee Type", "Amount (ZAR)"]],
      body: [
        ["Platform Fees", "x,xxx.xx"],
        ["Strategy Fees", "x,xxx.xx"],
        ["Brokerage & Execution", "xxx.xx"],
        ["Custody Fees", "xxx.xx"],
        ["Total Fees", "x,xxx.xx"],
      ],
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [59, 27, 122], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 300 },
        1: { cellWidth: 200, halign: "right" },
      },
      startY: section5StartY + 24,
      margin: { left: 32, right: 32 },
      tableWidth: "wrap",
    });

    const disclosuresStartY = ensurePageSpace((doc.lastAutoTable?.finalY || section5StartY + 120) + 40, 220);
    doc.setFontSize(16);
    doc.text("IMPORTANT DISCLOSURES & DISCLAIMERS", 32, disclosuresStartY, { align: "left" });
    doc.setFontSize(11);
    const disclosuresText = [
      "This statement is issued by MINT and is provided for information purposes only. It does not constitute investment advice, a recommendation, or an offer to buy or sell any financial instrument.",
      "MINT operates as a regulated financial services platform. Certain representatives and portfolio management functions may operate under supervision in accordance with the Financial Advisory and Intermediary Services Act, 2002 (FAIS). Where applicable, supervised representatives act under the oversight of approved key individuals and management structures.",
      "Client assets are held in custody with an approved third-party custodian, currently [Bank X], and are segregated from MINT’s own assets in accordance with applicable regulatory and custodial requirements. MINT does not commingle client funds with its own operating accounts.",
      "Investment strategies available on the platform are model-based and discretionary in nature. Strategy allocations, holdings, and rebalancing decisions are implemented in accordance with predefined investment mandates but may be adjusted from time to time based on market conditions, risk considerations, liquidity constraints, or operational requirements. Strategies may hold cash temporarily as part of portfolio construction, rebalancing processes, defensive positioning, or pending deployment. Cash balances reflected in this statement may therefore relate to both unallocated funds and strategy-level cash positions.",
      "Rebalancing is performed at intervals determined by the investment team and may not occur simultaneously across all client accounts. As a result, timing differences, cash drag, and execution variances may occur between accounts following the same strategy.",
      "Performance figures shown include both realised and unrealised gains and losses and are based on valuations available as at the statement date. Past performance is not indicative of future results. Market values may fluctuate and capital invested is not guaranteed.",
      "Transaction records include both strategy-driven trades and client-initiated self-directed trades. MINT does not warrant the completeness or accuracy of third-party market data and pricing sources used in compiling this statement.",
      "Tax treatment depends on individual circumstances and may change. Clients are responsible for obtaining independent tax advice.",
      "This statement should be read in conjunction with the platform terms and conditions, strategy disclosures, and risk warnings available on the MINT platform.",
    ];
    let disclosuresY = disclosuresStartY + 18;
    disclosuresText.forEach((paragraph) => {
      const lines = doc.splitTextToSize(paragraph, 530);
      const blockHeight = lines.length * 14;
      disclosuresY = ensurePageSpace(disclosuresY, blockHeight + 10);
      doc.text(lines, 32, disclosuresY, { align: "left" });
      disclosuresY += blockHeight + 8;
    });

    doc.save("statements.pdf");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)] text-slate-900">
      <div className="rounded-b-[36px] bg-gradient-to-b from-[#111111] via-[#3b1b7a] to-[#5b21b6] px-4 pb-10 pt-8 text-white">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName || "Profile"}
                  className="h-10 w-10 rounded-full border border-white/40 object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-slate-700">
                  {initials || "—"}
                </div>
              )}
            </div>
            <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-semibold">Statements</h1>
            <NotificationBell onClick={onOpenNotifications} />
          </header>
          <div className="flex w-full items-center justify-center">
            <div className="w-full max-w-md">
              <div className="grid w-full grid-cols-3 rounded-full bg-white/10 p-1 backdrop-blur-md">
                {[
                  { id: "strategy", label: "Strategy" },
                  { id: "holdings", label: "Individual Stocks" },
                  { id: "financials", label: "Financials" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      activeTab === tab.id
                        ? "w-full rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm"
                        : "w-full rounded-full px-3 py-1.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/10 hover:text-white"
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid w-full grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/70 shadow-sm backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="col-span-1 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm transition hover:bg-white"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-6 w-full max-w-md px-4 pb-16">
        <div className="rounded-2xl bg-white p-4 shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Recent items</p>
            <p className="text-xs text-slate-400">Showing {pageRows.length} of {filtered.length}</p>
          </div>

          <div className="mt-4 space-y-2">
            {pageRows.map((row, idx) => {
              const holdingStatus = row.status;
              const isHoldingsTab = activeTab === "holdings";
              const isIncoming = row.flow === "in";
              const indicator = isHoldingsTab
                ? holdingStatus === "Liquidated"
                  ? { icon: <ArrowDownRight className="h-3.5 w-3.5" />, color: "text-rose-500" }
                  : holdingStatus === "Filled"
                    ? { icon: <ArrowUpRight className="h-3.5 w-3.5" />, color: "text-emerald-600" }
                    : { icon: "—", color: "text-slate-400" }
                : isIncoming
                  ? { icon: <ArrowUpRight className="h-3.5 w-3.5" />, color: "text-emerald-600" }
                  : { icon: <ArrowDownRight className="h-3.5 w-3.5" />, color: "text-rose-500" };
              return (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-xl bg-white px-3 py-2.5 transition-all hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    {activeTab === "holdings" ? (
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                        {row.logoUrl ? (
                          <img
                            src={row.logoUrl}
                            alt={row.title}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-lg text-slate-500">—</span>
                        )}
                      </div>
                    ) : (
                      <div className="h-9 w-9 flex-shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[13px] leading-tight text-slate-900">{row.title}</h3>
                      <p className="text-[11px] leading-tight text-slate-500">{row.desc}</p>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center justify-end gap-1 text-sm text-slate-900">
                        <span className={indicator.color}>{indicator.icon}</span>
                        <span>{row.amount}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {row.date} · {row.time}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedCard(row)}
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              className={`rounded px-3 py-2 ${page === 1 ? "cursor-not-allowed opacity-40" : "bg-slate-100 hover:bg-slate-200"}`}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              ‹
            </button>
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`rounded px-3 py-2 ${
                  page === i + 1 ? "bg-violet-600 text-white" : "bg-transparent text-slate-600 hover:bg-slate-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              className={`rounded px-3 py-2 ${page === pages ? "cursor-not-allowed opacity-40" : "bg-slate-100 hover:bg-slate-200"}`}
              onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
              disabled={page === pages}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Close modal"
            onClick={() => setSelectedCard(null)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Statement Details</h2>
                <button
                  type="button"
                  onClick={() => setSelectedCard(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-6">
                {activeTab === "holdings" && (
                  <div className="flex items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                      {selectedCard.logoUrl ? (
                        <img
                          src={selectedCard.logoUrl}
                          alt={selectedCard.title}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-3xl text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                )}

                {selectedCard.type === "Holdings" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-1 text-xs uppercase text-slate-400">Instrument</p>
                        <p className="text-sm font-medium text-slate-900">{selectedCard.instrument}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-1 text-xs uppercase text-slate-400">Ticker</p>
                        <p className="text-sm font-medium text-slate-900">{selectedCard.ticker}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-1 text-xs uppercase text-slate-400">Quantity</p>
                        <p className="text-sm font-medium text-slate-900">{selectedCard.quantity}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-1 text-xs uppercase text-slate-400">Avg Cost</p>
                        <p className="text-sm font-medium text-slate-900">{selectedCard.avgCost}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-1 text-xs uppercase text-slate-400">Market Price</p>
                        <p className="text-sm font-medium text-slate-900">{selectedCard.marketPrice}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="mb-1 text-xs uppercase text-slate-400">Market Value</p>
                        <p className="text-sm font-medium text-slate-900">{selectedCard.marketValue}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="mb-1 text-xs uppercase text-slate-400">Unrealised P/L</p>
                      <p className="text-sm font-medium text-slate-900">{selectedCard.unrealizedPL}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="mb-2 text-xs uppercase text-slate-400">Strategy</p>
                      <div className="space-y-3 text-sm text-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Strategy Name</span>
                          <span className="font-medium text-slate-900">{strategyDetails?.strategyName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Allocation (%)</span>
                          <span className="font-medium text-slate-900">{strategyDetails?.allocation}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Capital Invested</span>
                          <span className="font-medium text-slate-900">{strategyDetails?.capitalInvested}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Current Value</span>
                          <span className="font-medium text-slate-900">{strategyDetails?.currentValue}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Unrealised P/L</span>
                          <span className="font-medium text-slate-900">{strategyDetails?.unrealisedPL}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Realised P/L</span>
                          <span className="font-medium text-slate-900">{strategyDetails?.realisedPL}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase text-slate-400">Total P/L</span>
                          <span className="font-semibold text-slate-900">{strategyDetails?.totalPL}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementsPage;
