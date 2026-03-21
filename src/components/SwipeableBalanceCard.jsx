import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Eye,
  EyeOff,
  TrendingUp,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { supabase } from "../lib/supabase";
import { getStrategyPriceHistory } from "../lib/strategyData";
import { useRealtimePrices } from "../lib/useRealtimePrices";
import Skeleton from "./Skeleton";
import SettlementBadge from "./PendingBadge";
import {
  useSettlementConfig,
  getSettlementStatusForHolding,
} from "../lib/useSettlementStatus";
import { useProfile } from "../lib/useProfile";

const VISIBILITY_STORAGE_KEY = "mintBalanceVisible";

const formatFull = (value) => {
  const num = Number(value);
  return `R${num.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatKMB = (value) => {
  const num = Number(value);
  const sign = num < 0 ? "-" : "";
  const absNum = Math.abs(num);
  let formatted = absNum;
  if (absNum >= 1e9) formatted = (absNum / 1e9).toFixed(1) + "b";
  else if (absNum >= 1e6) formatted = (absNum / 1e6).toFixed(1) + "m";
  else if (absNum >= 1e3) formatted = (absNum / 1e3).toFixed(1) + "k";
  else formatted = absNum.toFixed(2);
  return `${sign}R${formatted}`;
};

const TIMEFRAME_DAYS = { d: 7, w: 30, m: 90 };

const SwipeableBalanceCard = ({
  userId,
  isBackFacing = false,
  forceVisible,
  mintNumber: mintNumberProp,
}) => {
  const { profile } = useProfile();

  const [activeTab, setActiveTab] = useState("m");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { lastUpdated, isConnected } = useRealtimePrices();
  const settlementCfg = useSettlementConfig();
  const holdingSettlementStatus = getSettlementStatusForHolding(settlementCfg);
  const [showUpdatedText, setShowUpdatedText] = useState(false);
  const updatedTimerRef = useRef(null);

  // ── SWIPE/FLIP STATE ─────────────────────────────────────────────────────
  const [rotation, setRotation] = useState(isBackFacing ? 180 : 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const dragStartX = useRef(null);

  useEffect(() => {
    // Sync with parent prop if it changes
    setRotation(isBackFacing ? 180 : 0);
  }, [isBackFacing]);

  const handleDragStart = (e) => {
    if (isAnimating) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
  };

  const handleDragEnd = (e) => {
    if (isAnimating || dragStartX.current === null) return;
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const diff = dragStartX.current - clientX;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      setIsAnimating(true);
      // Flip 180 degrees in the direction of the swipe
      setRotation((prev) => (diff > 0 ? prev + 180 : prev - 180));
      setTimeout(() => setIsAnimating(false), 600);
    }
    dragStartX.current = null;
  };

  // ── FIX 1: Wallet balance state ──────────────────────────────────────────
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchWallet = async () => {
      setWalletLoading(true);
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", userId)
        .single();
      if (!error && data?.balance !== undefined) {
        setWalletBalance(Number(data.balance));
      }
      setWalletLoading(false);
    };
    fetchWallet();
  }, [userId]);

  // ── FIX 2: Mint number — fetch from DB if prop not provided ──────────────
  const [mintNumber, setMintNumber] = useState(mintNumberProp || null);

  useEffect(() => {
    // If parent already passed it in as a prop, use that
    if (mintNumberProp) {
      setMintNumber(mintNumberProp);
      return;
    }
    if (!userId) return;
    const fetchMintNumber = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("mint_number")
        .eq("id", userId)
        .single();
      if (!error && data?.mint_number) {
        setMintNumber(data.mint_number);
      }
    };
    fetchMintNumber();
  }, [userId, mintNumberProp]);

  useEffect(() => {
    if (lastUpdated) {
      setShowUpdatedText(true);
      if (updatedTimerRef.current) clearTimeout(updatedTimerRef.current);
      updatedTimerRef.current = setTimeout(
        () => setShowUpdatedText(false),
        3000,
      );
    }
    return () => {
      if (updatedTimerRef.current) clearTimeout(updatedTimerRef.current);
    };
  }, [lastUpdated]);

  const [dbData, setDbData] = useState({
    holdings: [],
    snapshots: [],
  });
  const [isVisible, setIsVisible] = useState(() => {
    if (forceVisible !== undefined) return forceVisible;
    const saved = localStorage.getItem(VISIBILITY_STORAGE_KEY);
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    if (!userId) return;
    const loadHoldings = async () => {
      const { data, error } = await supabase.rpc("get_user_holdings_v1", {
        p_user_id: userId,
      });
      if (!error && data) {
        setDbData((prev) => ({ ...prev, holdings: data }));
      }
    };
    loadHoldings();
  }, [userId]);

  const [chartLoading, setChartLoading] = useState(false);
  const [chartData, setChartData] = useState([]);
  const selectedAsset = null; // Simplified for this view

  useEffect(() => {
    const fetchChartData = async () => {
      if (!userId) return;
      setChartLoading(true);
      const days = TIMEFRAME_DAYS[activeTab] || 30;
      const { data, error } = await supabase.rpc("get_portfolio_history_v2", {
        p_user_id: userId,
        p_days: days,
      });
      if (!error && data) {
        setChartData(data.map((d) => ({ d: d.d, v: Number(d.v) })));
      }
      setChartLoading(false);
    };
    fetchChartData();
  }, [userId, activeTab]);

  const displayBalance = useMemo(() => {
    return dbData.holdings.reduce((sum, h) => sum + Number(h.market_value), 0);
  }, [dbData.holdings]);

  const displayReturn = useMemo(() => {
    const totalCost = dbData.holdings.reduce(
      (sum, h) => sum + Number(h.avg_fill || 0) * Number(h.quantity || 0),
      0,
    );
    return displayBalance - totalCost;
  }, [dbData.holdings, displayBalance]);

  const totalCost = useMemo(() => {
    return dbData.holdings.reduce(
      (sum, h) => sum + Number(h.avg_fill || 0) * Number(h.quantity || 0),
      0,
    );
  }, [dbData.holdings]);

  const returnPct =
    totalCost > 0 ? ((displayReturn / totalCost) * 100).toFixed(2) : "0.00";
  const isLoss = displayReturn < 0;
  const chartColor = isLoss ? "#FB7185" : "#10B981";

  const masked = "••••";

  if (loading && userId)
    return (
      <div className="w-full h-full rounded-[28px] bg-slate-50 p-4 flex flex-col">
        <div className="flex flex-1">
          <div className="w-[50%] flex flex-col justify-between border-r border-slate-200 pr-4">
            <div className="space-y-3">
              <div>
                <Skeleton className="h-2.5 w-20 bg-slate-200 mb-2" />
                <Skeleton className="h-5 w-24 bg-slate-200 mb-2" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16 bg-slate-200" />
                  <Skeleton className="h-4 w-10 rounded-full bg-slate-200" />
                </div>
              </div>
              <div>
                <Skeleton className="h-2.5 w-16 bg-slate-200 mb-2" />
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-14 rounded-full bg-slate-200" />
                  <Skeleton className="h-5 w-14 rounded-full bg-slate-200" />
                  <Skeleton className="h-5 w-10 rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          </div>
          <div className="w-[50%] flex flex-col justify-between pl-4">
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-8 rounded-full bg-slate-200" />
              <Skeleton className="h-5 w-8 rounded-full bg-slate-200" />
              <Skeleton className="h-5 w-8 rounded-full bg-slate-200" />
            </div>
            <div className="flex-1 flex items-end gap-1 py-3">
              {[40, 55, 35, 65, 50, 70, 45, 60, 75, 55].map((h, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-sm bg-slate-200"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <Skeleton className="h-8 w-full rounded-xl bg-slate-200" />
          </div>
        </div>
        <div className="mt-2 flex justify-start">
          <Skeleton className="h-3 w-32 bg-slate-200" />
        </div>
      </div>
    );

  const getUpdatedAgoText = () => {
    if (!lastUpdated) return "";
    const seconds = Math.round((Date.now() - lastUpdated) / 1000);
    if (seconds < 5) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds}s ago`;
    return `Updated ${Math.round(seconds / 60)}m ago`;
  };

  const masked = "••••";

  const scrollToHoldingIndex = (idx) => {
    // Simplified scroll logic
  };

  const setSelectedAsset = (asset) => {
    // Simplified asset selection
  };

  return (
    <div className="relative w-full z-10 rounded-[26px] overflow-hidden">
      {isConnected && (
        <div className="absolute top-2 right-3 z-20 flex items-center gap-1.5">
          {showUpdatedText && (
            <span
              className="text-[8px] text-slate-500 font-medium transition-opacity duration-500"
              style={{ animation: "fadeInOut 3s ease-in-out" }}
            >
              {getUpdatedAgoText()}
            </span>
          )}
          <span
            className="block w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
          />
          <style>{`
            @keyframes pulse-dot {
              0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); }
              50% { opacity: 0.7; box-shadow: 0 0 0 3px rgba(52, 211, 153, 0); }
            }
            @keyframes fadeInOut {
              0% { opacity: 0; }
              10% { opacity: 1; }
              80% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>
        </div>
      )}
      <div className="absolute inset-0 rounded-[26px] bg-[radial-gradient(circle_at_78%_18%,rgba(88,62,186,0.45),rgba(8,8,48,0.95)_46%,rgba(5,5,33,0.98)_100%)]" />
      <div className="relative z-10 flex flex-col p-4 text-slate-100">
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
            {selectedAsset ? selectedAsset.symbol : "portfolio value"}
          </p>
          <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/15 shrink-0">
            {["d", "w", "m"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-[10px] font-semibold rounded-md ${activeTab === tab ? "bg-white/10 text-white shadow-sm" : "text-slate-300"}`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[36px] leading-none font-bold text-white mb-3 w-full overflow-visible whitespace-nowrap">
          {isVisible ? (selectedAsset ? formatKMB(displayBalance) : formatFull(displayBalance)) : masked}
        </p>

        <div className="mb-2 flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-xl border text-sm font-semibold shrink-0 ${isLoss ? "border-rose-700/70 bg-rose-600/15 text-rose-300" : "border-emerald-700/70 bg-emerald-600/15 text-emerald-300"}`}>
            {isLoss ? "▼" : "▲"} {isVisible ? formatKMB(Math.abs(displayReturn)) : masked}
          </span>
          <span className={`text-[12px] font-medium shrink-0 ${isLoss ? "text-rose-300/80" : "text-emerald-300/80"}`}>
            {isVisible ? `${isLoss ? "-" : "+"}${returnPct}% all time` : masked}
          </span>
        </div>

        <div ref={dropdownRef} className="relative mb-2 self-end">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 min-w-[180px]"
          >
            <div className="flex items-center gap-2">
              <LayoutGrid size={12} className="text-violet-400" />
              <span className="text-[12px] leading-none font-medium text-slate-200 whitespace-nowrap">
                {selectedAsset ? selectedAsset.symbol : "All Investments"}
              </span>
            </div>
            {isOpen ? (
              <ChevronUp size={14} className="text-slate-300" />
            ) : (
              <ChevronDown size={14} className="text-slate-300" />
            )}
          </button>
          {isOpen && (
            <div className="absolute bottom-full mb-1 right-0 w-full bg-white rounded-xl z-[120] overflow-hidden border border-slate-200 shadow-lg">
              <div className="py-1 overflow-y-auto max-h-[140px]">
                <button
                  onClick={() => {
                    setSelectedAsset(null);
                    setIsOpen(false);
                    scrollToHoldingIndex(-1);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${!selectedAsset ? "bg-slate-100" : "hover:bg-slate-50"}`}
                >
                  <LayoutGrid size={10} className="text-violet-400 shrink-0" />
                  <span className="text-[9px] font-medium text-slate-700 truncate">
                    All Investments
                  </span>
                </button>
                {dbData.holdings.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedAsset(item);
                      setIsOpen(false);
                      scrollToHoldingIndex(idx);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${selectedAsset?.symbol === item.symbol ? "bg-slate-100" : "hover:bg-slate-50"}`}
                  >
                    <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-100 shrink-0">
                      {item.isStrategy && item.topLogos?.length > 0 ? (
                        <div className="flex -space-x-1 h-full items-center justify-center">
                          {item.topLogos.slice(0, 2).map((logo, li) => (
                            <img
                              key={li}
                              src={logo}
                              className="w-3 h-3 rounded-full object-cover border border-white/25"
                            />
                          ))}
                        </div>
                      ) : item.logo_url ? (
                        <img
                          src={item.logo_url}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-[6px] text-slate-500">
                          {item.symbol?.substring(0, 2)}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-medium text-slate-700 truncate">
                      {item.symbol}
                    </span>
                    {(() => {
                      if (item.isStrategy && Number(item.avg_fill || 0) === 0) {
                        return <SettlementBadge status="pending" size="xs" />;
                      }
                      if (item.settlement_status && item.settlement_status !== "confirmed") {
                        return <SettlementBadge status={item.settlement_status} size="xs" />;
                      }
                      const isSettlementActive = settlementCfg.brokerEnabled || settlementCfg.fullyIntegrated;
                      if (!isSettlementActive) return null;
                      const s = holdingSettlementStatus;
                      return s && s !== "confirmed" ? (
                        <SettlementBadge status={s} size="xs" />
                      ) : null;
                    })()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mb-3 w-full overflow-hidden" style={{ minHeight: 100, height: 100 }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={100}>
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
                  >
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-1 shadow-md">
                            <p className="text-[9px] text-slate-500">{payload[0]?.payload?.d}</p>
                            <p className="text-[10px] font-semibold text-slate-800">{formatKMB(payload[0]?.value)}</p>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine
                      y={0}
                      stroke="rgba(148,163,184,0.5)"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="none"
                      fill={chartColor}
                      fillOpacity={0.1}
                    />
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={chartColor}
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  {chartLoading ? (
                    <div className="flex items-end gap-1 w-full h-full py-2">
                      {[40, 55, 35, 65, 50, 70, 45, 60, 75, 55, 65, 50].map(
                        (h, i) => (
                          <Skeleton
                            key={i}
                            className="flex-1 rounded-sm bg-white/10"
                            style={{ height: `${h}%` }}
                          />
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-500">No chart data</p>
                  )}
                </div>
              )}
            </div>
        <div className="mt-auto pt-3 pb-5 border-t border-white/10 flex items-start">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-medium mb-0.5">
              ACCOUNT BALANCE
            </p>
            <p className="text-[11px] font-semibold text-slate-100 truncate">
              {isVisible ? (walletLoading ? "Loading..." : formatFull(walletBalance)) : masked}
            </p>
          </div>
          <div className="w-px self-stretch bg-white/10" />
          <div className="flex-1 min-w-0 pl-3">
            <p className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-medium mb-0.5" style={{ fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif" }}>
              MINT NUMBER
            </p>
            <p className="text-[11px] tracking-[0.1em] text-slate-300 font-mono font-bold truncate">
              {mintNumber ?? "GENERATING..."}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 0 3px rgba(52, 211, 153, 0); }
        }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      `}</style>
    </div>
  );
};

export default SwipeableBalanceCard;
