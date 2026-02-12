import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMarketsSecuritiesWithMetrics, getSecurityPrices } from './marketData';

export function useStockQuotes(enabled = true) {
  const [securities, setSecurities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSecurities = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const allSecurities = await getMarketsSecuritiesWithMetrics();
      setSecurities(allSecurities);
      setError(null);
    } catch (err) {
      console.error('Error fetching securities:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchSecurities();
  }, [fetchSecurities]);

  const quotes = useMemo(() => {
    const map = {};
    securities.forEach(sec => {
      map[sec.symbol] = {
        symbol: sec.symbol,
        name: sec.name,
        price: sec.currentPrice,
        previousClose: sec.prevClose,
        change: sec.changeAbs,
        changePercent: sec.changePct,
        logo: sec.logo_url,
        id: sec.id,
        returns: sec.returns,
      };
    });
    return map;
  }, [securities]);

  return { quotes, securities, loading, error, refetch: fetchSecurities };
}

export function useStockChart(securityId, timeFilter) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getTimeframe = (filter) => {
    switch (filter) {
      case 'D': return '1D';
      case 'W': return '1W';
      case 'M': return '1M';
      case 'ALL': return '1Y';
      default: return '1M';
    }
  };

  useEffect(() => {
    if (!securityId) {
      setChartData([]);
      setLoading(false);
      return;
    }

    const fetchChart = async () => {
      try {
        setLoading(true);
        const timeframe = getTimeframe(timeFilter);
        const prices = await getSecurityPrices(securityId, timeframe);

        const formatted = (prices || []).map(p => {
          const date = new Date(p.ts);
          let label;

          if (timeFilter === 'D') {
            label = date.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
          } else if (timeFilter === 'W') {
            label = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
          } else if (timeFilter === 'M') {
            label = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
          } else {
            label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          }

          return {
            day: label,
            value: Number(p.close.toFixed(2)),
            timestamp: new Date(p.ts).getTime(),
          };
        });

        setChartData(formatted);
        setError(null);
      } catch (err) {
        console.error('Error fetching stock chart:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
  }, [securityId, timeFilter]);

  return { chartData, loading, error };
}
