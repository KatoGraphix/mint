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
  YAxis,
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

const formatYAxis = (value) => {
  const num = Number(value);
  if (Math.abs(num) < 0.5) return "R0";
  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);
  if (abs >= 1e6) return `${sign}R${(abs / 1e6).toFixed(1)}m`;
  if (abs >= 1e3) return `${sign}R${(abs / 1e3).toFixed(0)}k`;
  return `${sign}R${abs.toFixed(0)}`;
};

const SwipeableBalanceCard = ({
  userId,
  isBackFacing = false,
  forceVisible,
  mintNumber: mintNumberProp,
  onBuyPress,
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

  const chartAxisConfig = useMemo(() => {
    if (chartData.length === 0) return { domain: [0, 100], ticks: [0, 50, 100] };
    const vals = chartData.map((d) => d.v);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const padding = (max - min) * 0.1 || 10;
    return {
      domain: [min - padding, max + padding],
      ticks: [min, (min + max) / 2, max],
    };
  }, [chartData]);

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
    <div 
      className="relative w-full h-full z-10 select-none touch-pan-y"
      style={{ perspective: "1200px" }}
      onTouchStart={handleDragStart}
      onTouchEnd={handleDragEnd}
      onMouseDown={handleDragStart}
      onMouseUp={handleDragEnd}
    >
      <div 
        className="relative w-full h-full transition-transform duration-700 ease-out"
        style={{ 
          transform: `rotateY(${rotation}deg)`,
          transformStyle: "preserve-3d"
        }}
      >
        {/* ── FRONT FACE: Account Balance + Cardholder ── */}
        <div 
          className="absolute inset-0 w-full h-full bg-white rounded-[28px] shadow-sm border border-slate-100 p-8 flex flex-col justify-between"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          {isConnected && (
            <div className="absolute top-2 right-3 z-20 flex items-center gap-1.5">
              {showUpdatedText && (
                <span className="text-[8px] text-slate-500 font-medium">{getUpdatedAgoText()}</span>
              )}
              <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
          )}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">
              Account Balance
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {isVisible ? (walletLoading ? "Loading..." : formatFull(walletBalance)) : masked}
            </p>
          </div>
          
          <div className="mt-auto">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">
                  Cardholder
                </p>
                <p className="text-lg font-bold text-slate-800 uppercase tracking-wide">
                  {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : "MINT MEMBER"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-slate-200 tracking-tighter italic">
                  MINT
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── BACK FACE: Portfolio + MINT# + Chart + Dropdown ── */}
        <div 
          className="absolute inset-0 w-full h-full bg-white rounded-[28px] shadow-sm border border-slate-100 flex flex-col"
          style={{ 
            backfaceVisibility: "hidden", 
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)" 
          }}
        >
          {isConnected && (
            <div className="absolute top-2 right-3 z-20 flex items-center gap-1.5">
              {showUpdatedText && (
                <span className="text-[8px] text-slate-500 font-medium">{getUpdatedAgoText()}</span>
              )}
              <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
          )}
          
          <div className="flex flex-1 min-h-0">
            {/* Split View Left: Stats */}
            <div className="w-[50%] p-4 pb-3 flex flex-col border-r border-slate-100 overflow-hidden">
              <div className="flex flex-col flex-1 min-h-0 gap-2">
                <div className="shrink-0">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium mb-1.5 truncate">
                    {selectedAsset ? selectedAsset.symbol : "portfolio value"}
                  </p>
                  <p className="text-base font-bold text-slate-900 mb-2 truncate">
                    {isVisible ? (selectedAsset ? formatKMB(displayBalance) : formatFull(displayBalance)) : masked}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold shrink-0 ${isLoss ? "text-rose-400" : "text-emerald-400"}`}>
                      {isLoss ? "▼" : "▲"} {isVisible ? formatKMB(Math.abs(displayReturn)) : masked}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-medium uppercase shrink-0 ${isLoss ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                      {isVisible ? `${isLoss ? "-" : "+"}${returnPct}%` : masked}
                    </span>
                  </div>
                </div>
                <div className="mt-auto pt-2 border-t border-slate-100/50">
                  <p className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-medium mb-0.5 truncate" style={{ fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif" }}>
                    MINT NUMBER
                  </p>
                  <p className="text-[11px] tracking-[0.1em] text-slate-700 font-mono font-bold truncate">
                    {mintNumber ?? "GENERATING..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Split View Right: Chart + Details */}
            <div className="w-[50%] p-4 pb-4 flex flex-col">
              <div className="flex justify-end mb-2">
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                  {["d", "w", "m"].map((tab) => (
                    <button
                      key={tab}
                      onClick={(e) => { e.stopPropagation(); setActiveTab(tab); }}
                      className={`px-3 py-1 text-[10px] font-semibold rounded-md ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1" style={{ minHeight: 100, height: 100 }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={100}>
                    <ComposedChart data={chartData} margin={{ top: 2, right: 0, left: -12, bottom: 0 }}>
                      <YAxis domain={chartAxisConfig.domain} ticks={chartAxisConfig.ticks} tickFormatter={formatYAxis} tick={{ fontSize: 8, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={42} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-1 shadow-md">
                            <p className="text-[9px] text-slate-500">{payload[0]?.payload?.d}</p>
                            <p className="text-[10px] font-semibold text-slate-800">{formatKMB(payload[0]?.value)}</p>
                          </div>
                        );
                      }} />
                      <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth={1} />
                      <Area type="monotone" dataKey="v" stroke="none" fill={chartColor} fillOpacity={0.1} />
                      <Line type="monotone" dataKey="v" stroke={chartColor} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    {chartLoading ? (
                      <div className="flex items-end gap-1 w-full h-full py-2">
                        {[40, 55, 35, 65, 50, 70, 45, 60, 75, 55, 65, 50].map((h, i) => (
                          <Skeleton key={i} className="flex-1 rounded-sm bg-slate-100" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-slate-500">No chart data</p>
                    )}
                  </div>
                )}
              </div>

              <div ref={dropdownRef} className="relative">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                  className="mt-2 mb-1 flex items-center justify-between p-2 rounded-xl bg-slate-100 border border-slate-200 w-full"
                >
                  <div className="flex items-center gap-2">
                    <LayoutGrid size={12} className="text-violet-400" />
                    <span className="text-[10px] font-medium text-slate-700">
                      {selectedAsset ? selectedAsset.symbol : "All Investments"}
                    </span>
                  </div>
                  {isOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                </button>
                {isOpen && (
                  <div className="absolute bottom-full mb-1 right-0 w-full bg-white rounded-xl z-[120] overflow-hidden border border-slate-200 shadow-lg" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                    <div className="py-1 overflow-y-auto max-h-[140px]">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedAsset(null); setIsOpen(false); scrollToHoldingIndex(-1); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${!selectedAsset ? "bg-slate-100" : "hover:bg-slate-50"}`}
                      >
                        <LayoutGrid size={10} className="text-violet-400 shrink-0" />
                        <span className="text-[9px] font-medium text-slate-700 truncate">All Investments</span>
                      </button>
                      {dbData.holdings.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => { e.stopPropagation(); setSelectedAsset(item); setIsOpen(false); scrollToHoldingIndex(idx); }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-left ${selectedAsset?.symbol === item.symbol ? "bg-slate-100" : "hover:bg-slate-50"}`}
                        >
                          <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-100 shrink-0">
                            {item.isStrategy && item.topLogos?.length > 0 ? (
                              <div className="flex -space-x-1 h-full items-center justify-center">
                                {item.topLogos.slice(0, 2).map((logo, li) => (
                                  <img key={li} src={logo} className="w-3 h-3 rounded-full object-cover border border-white/25" />
                                ))}
                              </div>
                            ) : item.logo_url ? (
                              <img src={item.logo_url} className="w-full h-full object-cover" />
                            ) : (
                              <span className="flex items-center justify-center w-full h-full text-[6px] text-slate-500">{item.symbol?.substring(0, 2)}</span>
                            )}
                          </div>
                          <span className="text-[9px] font-medium text-slate-700 truncate">{item.symbol}</span>
                          {(() => {
                            if (item.isStrategy && Number(item.avg_fill || 0) === 0) {
                              return <SettlementBadge status="pending" size="xs" />;
                            }
                            if (item.settlement_status && item.settlement_status !== "confirmed") {
                              return <SettlementBadge status={item.settlement_status} size="xs" />;
                            }
                            const isSettlementActive = settlementCfg.brokerEnabled || settlementCfg.fullyIntegrated;
                            if (!isSettlementActive) return null;
                            const s = getSettlementStatusForHolding(settlementCfg); // Simplified
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
            </div>
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