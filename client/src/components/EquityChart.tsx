import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, startOfDay, startOfWeek, startOfMonth, addHours, addDays, addMonths } from "date-fns";
import { useState } from "react";
import { clsx } from "clsx";


interface ChartDataPoint {
  timestamp: string;
  equity: number;
  balance: number;
  // 'ts' is a numeric timestamp (ms) used for chart domaining
  ts?: number;
}

interface EquityChartProps {
  data?: ChartDataPoint[];
  onPeriodChange: (period: "1D" | "1W" | "1M" | "1Y" | "ALL") => void;
  isLoading?: boolean;
}

const periodLabels: Record<string, string> = {
  "1D": "D",
  "1W": "W", 
  "1M": "M",
  "1Y": "Y",
  "ALL": "All"
};



import { Link } from "wouter";

export function EquityChart({ data, onPeriodChange, isLoading }: EquityChartProps) {
  const [activePeriod, setActivePeriod] = useState<"1D" | "1W" | "1M" | "1Y" | "ALL">("1D");

  const handlePeriodChange = (period: "1D" | "1W" | "1M" | "1Y" | "ALL") => {
    setActivePeriod(period);
    onPeriodChange(period);
  };

  // --- UI: Timeframe selector on the left ---
  const Selector = (
    <div className="flex bg-black/20 backdrop-blur-md rounded-full p-1 border border-white/5 w-auto overflow-x-auto no-scrollbar">
      {["1D", "1W", "1M", "1Y", "ALL"].map((p) => (
        <button
          key={p}
          onClick={() => handlePeriodChange(p as any)}
          className={clsx(
            "sm:flex-none px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-medium transition-all duration-300 whitespace-nowrap",
            activePeriod === p 
              ? "bg-white text-black shadow-lg shadow-white/10" 
              : "text-muted-foreground hover:text-white"
          )}
        >
          {periodLabels[p]}
        </button>
      ))}
    </div>
  );


  if (isLoading) {
    return (
      <div className="w-full h-[300px] md:h-[400px] bg-white/5 rounded-3xl animate-pulse flex items-center justify-center">
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[300px] md:h-[400px] bg-white/5 rounded-3xl flex items-center justify-center border border-white/5">
        <div className="text-center px-4">
          <p className="text-muted-foreground mb-4">No data available for this period</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {Selector}
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  // Prepare numeric timestamp field for better domain control (so 'ALL' can span from earliest trade)
  const parseTimestampMs = (t: any) => {
    // Prefer explicit seconds -> ms conversion: new Date(Number(trade.timestamp) * 1000)
    const n = Number(t);
    if (!Number.isNaN(n)) {
      // If number looks like milliseconds already (>1e12), keep it, otherwise treat as seconds and multiply
      return n > 1e12 ? n : n * 1000;
    }
    // Fallback: parse ISO string
    return new Date(t).getTime();
  };

  const numericData = data ? data.map(d => ({
    // normalize timestamp and numeric fields so chart always plots `balance`
    ...d,
    ts: parseTimestampMs(d.timestamp),
    balance: Number(d.balance ?? 0),
    equity: Number(d.equity ?? 0),
  })) : undefined;
  // Ensure points are sorted by timestamp so domain starts at the exact first trade
  const sortedData = numericData ? [...numericData].sort((a,b) => (a.ts! - b.ts!)) : undefined;


  // Compute strict period start/end boundaries (hard boundaries)
  const computePeriodRange = (period: string) => {
    const now = new Date();
    if (period === '1D') return { start: startOfDay(now).getTime(), end: (new Date(startOfDay(now).getTime()).setHours(23,59,59,999)) };
    if (period === '1W') {
      const monday = startOfWeek(now, { weekStartsOn: 1 });
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
      return { start: monday.getTime(), end: sunday.getTime() };
    }
    if (period === '1M') {
      const start = startOfMonth(now).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999).getTime();
      return { start, end };
    }
    if (period === '1Y') {
      const start = new Date(now.getFullYear(), 0, 1, 0,0,0,0).getTime();
      const end = new Date(now.getFullYear(), 11, 31, 23,59,59,999).getTime();
      return { start, end };
    }
    // ALL: use earliest data point (first trade or snapshot) as start and now as end
    // Filter out obviously-bogus timestamps (seconds-based threshold -> year 2001)
    const MIN_VALID_SECONDS = 1000000000; // 2001-09-09
    // Ensure ts is normalized to milliseconds when checking
    const normalized = (sortedData ?? []).map(d => ({ ...d, ts: d.ts! < 1e11 ? d.ts! * 1000 : d.ts! }));
    const validData = normalized.filter(d => (d.ts ?? 0) > MIN_VALID_SECONDS * 1000);
    // For portfolio ALL, use the earliest ts across all accounts (if provided via prop)
    // Otherwise, fallback to min of this chart's data
    const minTs = validData.length > 0 ? Math.min(...validData.map(d => d.ts!)) : Date.now();
    return { start: minTs, end: Date.now() };
  };

  const { start: periodStart, end: periodEnd } = computePeriodRange(activePeriod);

  // Nudge the left domain inward by 1ms so the left-most tick/label
  // (e.g. Week 1 / Jan) sits inside the domain and is rendered by Recharts.
  const domainStartNudged = (periodStart as number) - 0.5;

  // Generate ticks based on period to ensure all key labels are shown
  const generateTicks = () => {
    const ticks: number[] = [];
    
    if (activePeriod === '1D') {
      // Every 2 hours from 00:00 to 22:00, then include 23:59 as final tick
      const start = startOfDay(new Date(periodStart)).getTime();
      const end = new Date(startOfDay(new Date(periodStart)).getTime()).setHours(23, 59, 59, 999);
      let current = start;
      while (current <= end) {
        ticks.push(current);
        current = addHours(new Date(current), 3).getTime();
      }
      // If the last tick isn't exactly the end-of-day, ensure 23:59 is present
      if (ticks.length === 0 || ticks[ticks.length - 1] < end) ticks.push(end);
    } else if (activePeriod === '1W') {
      // Daily ticks, ensuring all days are shown
      const monday = startOfWeek(new Date(periodStart), { weekStartsOn: 1 });
      for (let i = 0; i < 7; i++) {
        ticks.push(new Date(monday).setDate(monday.getDate() + i));
      }
    } else if (activePeriod === '1M') {
      // Weekly ticks starting from day 1 - ensure Week 1 is included
      const periodStartDate = new Date(periodStart);
      const monthStart = startOfMonth(periodStartDate);
      // Explicitly add day 1 (Week 1) first
      ticks.push(monthStart.getTime());
      // Then add subsequent weeks
      for (let i = 1; i <= 4; i++) {
        const tickDate = new Date(monthStart);
        tickDate.setDate(monthStart.getDate() + (i * 7));
        // Only add if within current month
        if (tickDate.getMonth() === monthStart.getMonth()) {
          ticks.push(tickDate.getTime());
        }
      }
    } else if (activePeriod === '1Y') {
      // Monthly ticks - ensure January (month 0) is always included
      const periodStartDate = new Date(periodStart);
      const yearStart = new Date(periodStartDate.getFullYear(), 0, 1);
      // Explicitly add January first
      ticks.push(yearStart.getTime());
      // Then add remaining months
      for (let i = 1; i < 12; i++) {
        ticks.push(new Date(yearStart.getFullYear(), i, 1).getTime());
      }
    } else {
      // ALL: Force exactly 5 evenly-spaced ticks across the full timespan (Rule of 5)
      const allStart = new Date(periodStart).getTime();
      const allEnd = new Date(periodEnd).getTime();
      const maxTicks = 5;

      // Guard: if period is degenerate, return start/end duplicates
      if (!Number.isFinite(allStart) || !Number.isFinite(allEnd) || allEnd <= allStart) {
        for (let i = 0; i < maxTicks; i++) ticks.push(allStart);
      } else {
        const step = (allEnd - allStart) / (maxTicks - 1);
        for (let i = 0; i < maxTicks; i++) {
          const t = Math.round(allStart + step * i);
          ticks.push(t);
        }
      }
    }
    return ticks;
  };

  const chartTicks = generateTicks();

  // --- Main Chart Render ---
  return (
    <>
      
      <div className="glass-panel rounded-3xl p-4 md:p-8 relative overflow-hidden group">
        {/* Header with period toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
          <div>{Selector}</div>
        </div>

        {/* Chart */}
        <div className="h-[200px] md:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sortedData}>
              <defs>
                <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fff" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="ts" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#666', fontSize: 10 }}
                tickFormatter={(val) => {
                  const date = new Date(Number(val));
                  if (activePeriod === '1D') return format(date, 'HH:mm');
                  if (activePeriod === '1W') {
                    // Show weekday names for weekly view (Mon, Tue, Wed...)
                    return format(date, 'EEE');
                  }
                  if (activePeriod === '1M') {
                    const periodStartDate = new Date(periodStart);
                    const monthStart = startOfMonth(periodStartDate);
                    const weekNum = Math.floor((Number(val) - monthStart.getTime()) / (7 * 24 * 3600000)) + 1;
                    return `Week ${weekNum}`;
                  }
                  if (activePeriod === '1Y') return format(date, 'MMM');
                  if (activePeriod === 'ALL') return format(date, 'MMM yyyy');
                  return format(date, 'MMM');
                }}
                minTickGap={0}
                interval={0}
                type="number"
                scale="time"
                ticks={chartTicks}
                domain={[domainStartNudged as any, periodEnd as any]}
                allowDataOverflow={false}
                padding={{ left: 24, right: 48 }}
              />
              <YAxis 
                hide
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    let dateLabel = '';
                    const date = new Date(Number(label));
                    if (activePeriod === 'ALL') dateLabel = format(date, 'MMM yyyy');
                    else if (activePeriod === '1D') dateLabel = format(date, 'HH:mm');
                    else if (activePeriod === '1W') dateLabel = format(date, 'EEE, MMM d');
                    else if (activePeriod === '1M') dateLabel = format(date, 'MMM d');
                    else if (activePeriod === '1Y') dateLabel = format(date, 'MMM yyyy');

                    // Prefer server-provided per-point profit when available
                    const balanceEntry = payload.find((p: any) => p.dataKey === 'balance');
                    const currentBalance = Number(balanceEntry?.value ?? 0);
                    const pointPayload = (balanceEntry && balanceEntry.payload) || payload[0]?.payload || {};

                    let totalProfit = Number(pointPayload.profit ?? 0);
                    let totalPercent = Number(pointPayload.profitPercent ?? NaN);

                    // If server did not provide profitPercent, compute using the formula:
                    // Return % = (Profit / (Balance - Profit)) * 100
                    if (!Number.isFinite(totalPercent)) {
                      if (Number.isFinite(totalProfit)) {
                        const denom = currentBalance - totalProfit;
                        totalPercent = denom > 0 ? (totalProfit / denom) * 100 : 0;
                      } else {
                        totalPercent = 0;
                      }
                    }

                    const isProfit = totalProfit >= 0;
                    return (
                      <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-2 md:p-3 rounded-xl shadow-2xl">
                        <p className="text-zinc-400 text-[10px] md:text-xs mb-1">{dateLabel}</p>
                        <p className="text-white font-bold text-sm md:text-lg">
                          {formatCurrency(currentBalance)}
                          <span className={`ml-2 text-xs font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {totalPercent.toFixed(2)}%
                          </span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke="#fff" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorEquity)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}


