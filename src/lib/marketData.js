import { supabase } from "./supabase";

// Simple in-memory cache with timestamps
const cache = {
  markets: { data: null, timestamp: 0, ttl: 60000 }, // 60 seconds
  priceHistory: new Map(), // key: `${security_id}_${timeframe}`, value: { data, timestamp, ttl }
};

/**
 * Get all securities with their latest metrics from Supabase
 * @returns {Promise<Array>} Array of securities with metrics
 */
export const getMarketsSecuritiesWithMetrics = async () => {
  const now = Date.now();
  
  // Check cache
  if (cache.markets.data && (now - cache.markets.timestamp) < cache.markets.ttl) {
    console.log("📦 Using cached markets data");
    return cache.markets.data;
  }

  if (!supabase) {
    console.error("❌ Supabase client not initialized");
    return [];
  }

  try {
    console.log("🔍 Fetching securities with metrics from Supabase...");
    
    // Fetch securities - last_price and change_percentage are directly on securities table
    const { data: securities, error: securitiesError } = await supabase
      .from("securities")
      .select(`
        *
      `)
      .eq("is_active", true)
      .order("market_cap", { ascending: false, nullsFirst: false });

    if (securitiesError) {
      console.error("❌ Error fetching securities:", securitiesError);
      throw securitiesError;
    }

    console.log("🔍 Raw securities sample:", securities?.[0]);

    // Process securities - convert last_price from cents to Rands
    const processedSecurities = (securities || []).map(security => {
      return {
        ...security,
        // Convert last_price from cents to Rands by dividing by 100
        currentPrice: security.last_price ? Number(security.last_price) / 100 : null,
        // Use change_percentage directly without division
        changePct: security.change_percentage != null
          ? Number(security.change_percentage)
          : security.change_percent != null
            ? Number(security.change_percent)
            : null,
      };
    });

    console.log(`✅ Fetched ${processedSecurities.length} securities with metrics`);
    
    // Update cache
    cache.markets.data = processedSecurities;
    cache.markets.timestamp = now;
    
    return processedSecurities;
  } catch (error) {
    console.error("💥 Exception while fetching securities with metrics:", error);
    return [];
  }
};

/**
 * Get a single security by symbol with its metrics
 * @param {string} symbol - The stock symbol
 * @returns {Promise<Object|null>} Security object with metrics or null
 */
export const getSecurityBySymbol = async (symbol) => {
  if (!supabase || !symbol) {
    console.error("❌ Supabase client not initialized or symbol missing");
    return null;
  }

  try {
    console.log(`🔍 Fetching security ${symbol}...`);
    
    // First, fetch the security
    const { data: security, error: securityError } = await supabase
      .from("securities")
      .select("*")
      .eq("symbol", symbol)
      .eq("is_active", true)
      .single();

    if (securityError) {
      console.error(`❌ Error fetching security ${symbol}:`, securityError);
      return null;
    }

    if (!security) {
      console.warn(`⚠️ No security found for symbol ${symbol}`);
      return null;
    }

    console.log(`✅ Found security ${symbol}, id: ${security.id}`);
    
    const processedSecurity = {
      ...security,
      // Convert last_price from cents to Rands by dividing by 100
      currentPrice: security.last_price ? Number(security.last_price) / 100 : null,
        // change_price is already in cents, keep it as is for flexibility
        change_price: security.change_price != null ? Number(security.change_price) : null,
      // Use change_percentage or change_percent directly without division
      changePct: security.change_percentage != null
        ? Number(security.change_percentage)
        : security.change_percent != null
          ? Number(security.change_percent)
          : null,
    };

    console.log(`✅ Processed ${symbol} with currentPrice: ${processedSecurity.currentPrice}, changeAbs: ${processedSecurity.changeAbs}`);
    return processedSecurity;
  } catch (error) {
    console.error(`💥 Exception while fetching security ${symbol}:`, error);
    return null;
  }
};

/**
 * Get price history for a security based on timeframe
 * @param {string} securityId - The security ID
 * @param {string} timeframe - One of: "1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "5Y"
 * @returns {Promise<Array>} Array of {ts, close} objects
 */
export const getSecurityPrices = async (securityId, timeframe = "1M") => {
  if (!supabase || !securityId) {
    console.error("❌ Supabase client not initialized or securityId missing");
    return [];
  }

  // Check cache
  const cacheKey = `${securityId}_${timeframe}`;
  const cached = cache.priceHistory.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < 60000) { // 60 second TTL
    console.log(`📦 Using cached price history for ${cacheKey}`);
    return cached.data;
  }

  try {
    console.log(`🔍 Fetching price history for security ${securityId}, timeframe ${timeframe}...`);
    
    // Calculate how many days to fetch based on timeframe
    let daysToFetch = 30;
    let dateFilter = null;
    
    switch (timeframe) {
      case "1D":
        // Since we don't have intraday data yet, fetch last 30 days and display as "1M" style
        daysToFetch = 30;
        break;
      case "1W":
        daysToFetch = 10; // ~2 weeks of trading days to get 7-10 days
        break;
      case "1M":
        daysToFetch = 45; // ~30 trading days
        break;
      case "3M":
        daysToFetch = 110; // ~90 trading days
        break;
      case "6M":
        daysToFetch = 220; // ~180 trading days
        break;
      case "YTD":
        // Get from Jan 1 of current year
        const currentYear = new Date().getFullYear();
        dateFilter = new Date(currentYear, 0, 1).toISOString();
        break;
      case "1Y":
        daysToFetch = 420; // ~365 trading days
        break;
      case "5Y":
        daysToFetch = 1825; // ~5 years
        break;
      default:
        daysToFetch = 45;
    }

    let query = supabase
      .from("security_prices")
        .select("ts, close_price")
      .eq("security_id", securityId)
      .order("ts", { ascending: true });

    if (dateFilter) {
      // YTD filter
      query = query.gte("ts", dateFilter);
    } else {
      // Fetch last N days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToFetch);
      query = query.gte("ts", cutoffDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error(`❌ Error fetching price history:`, error);
      throw error;
    }

    const prices = (data || []).map(row => ({
      ts: row.ts,
        // close_price is in cents, convert to Rands
        close: row.close_price ? Number(row.close_price) / 100 : null,
    }));

    console.log(`✅ Fetched ${prices.length} price points for ${timeframe}`);
    
    // Cache the result
    cache.priceHistory.set(cacheKey, {
      data: prices,
      timestamp: now,
    });
    
    return prices;
  } catch (error) {
    console.error(`💥 Exception while fetching price history:`, error);
    return [];
  }
};

/**
 * Convert price history to normalized series (starting at 100)
 * @param {Array} prices - Array of {ts, close} objects
 * @returns {Array} Array of {ts, close, normalized} objects
 */
export const normalizePriceSeries = (prices) => {
  if (!prices || prices.length === 0) return [];
  
  const firstClose = prices[0].close;
  if (!firstClose || firstClose === 0) return prices;
  
  return prices.map(point => ({
    ...point,
    normalized: (point.close / firstClose) * 100,
  }));
};

/**
 * Clear all caches (useful for forcing refresh)
 */
export const clearMarketDataCache = () => {
  cache.markets.data = null;
  cache.markets.timestamp = 0;
  cache.priceHistory.clear();
  console.log("🧹 Market data cache cleared");
};
