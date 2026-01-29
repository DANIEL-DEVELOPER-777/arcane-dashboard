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

  const numericData = data ? data.map(d => ({ ...d, ts: parseTimestampMs(d.timestamp) })) : undefined;
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


  // Generate ticks based on periodStart/periodEnd, always include zero-points
  const generateTicks = (min: number, max: number, period: string) => {
    const ticks: number[] = [];
    if (period === "1D") {
      // Always include 00:00
      ticks.push(startOfDay(new Date(min)).getTime());
      for (let t = min; t <= max; t += 3600000) ticks.push(t);
    } else if (period === "1W") {
      // Always include Monday
      const monday = startOfWeek(new Date(min), { weekStartsOn: 1 });
      ticks.push(monday.getTime());
      for (let t = min; t <= max; t += 86400000) ticks.push(t);
    } else if (period === "1M") {
      // Always include Week 1
      ticks.push(startOfMonth(new Date(min)).getTime());
      for (let t = min; t <= max; t = addDays(new Date(t), 7).getTime()) ticks.push(t);
    } else if (period === "1Y") {
      // Always include January
      ticks.push(new Date(new Date(min).getFullYear(), 0, 1).getTime());
      for (let m = 0; ; m++) {
        const dt = addMonths(new Date(min), m).getTime();
        if (dt > max) break;
        ticks.push(new Date(dt).getTime());
      }
    } else {
      // ALL: Always include first month of account creation
      ticks.push(new Date(min).getTime());
      for (let m = 0; ; m++) {
        const dt = addMonths(new Date(min), m).getTime();
        if (dt > max) break;
        ticks.push(new Date(dt).getTime());
      }
    }
    // Remove duplicates and sort
    return Array.from(new Set(ticks)).sort((a, b) => a - b);
  };

  const ticks = generateTicks(periodStart, periodEnd, activePeriod);


  return (
    <div className="glass-panel rounded-3xl p-4 md:p-8 relative overflow-hidden group">
      {/* Header with period toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
        <div>{Selector}</div>
      </div>

      {/* Chart */}
      <div className="h-[200px] md:h-[300px] w-full -ml-2">
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
                if (activePeriod === '1D') return format(new Date(Number(val)), 'HH:mm');
                if (activePeriod === '1W') return format(new Date(Number(val)), 'EEE');
                if (activePeriod === '1M') {
                  const monthStart = startOfMonth(new Date(periodStart));
                  const weekNum = Math.floor((Number(val) - monthStart.getTime()) / (7 * 24 * 3600000)) + 1;
                  return `Week ${weekNum}`;
                }
                if (activePeriod === '1Y') return format(new Date(Number(val)), 'MMM');
                return format(new Date(Number(val)), 'MMM yyyy');
              }}
              minTickGap={(activePeriod === '1D' || activePeriod === '1W') ? 0 : 20}
              domain={[periodStart as any, periodEnd as any]}
              type="number"
              scale="time"
              ticks={ticks}
              allowDataOverflow={false}
            />
            <YAxis 
              hide
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const dateLabel = activePeriod === "ALL" ? format(new Date(Number(label)), "MMM yyyy") : format(new Date(Number(label)), "MMM d, HH:mm");
                  return (
                    <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-2 md:p-3 rounded-xl shadow-2xl">
                      <p className="text-zinc-400 text-[10px] md:text-xs mb-1">{dateLabel}</p>
                      <p className="text-white font-bold text-sm md:text-lg">
                        {formatCurrency(payload[0].value as number)}
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
  );
}
