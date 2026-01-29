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



import { ArrowLeft } from "lucide-react";
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

  // --- UI: Back button on the left ---
  const BackButton = (
    <div className="absolute left-4 top-4 z-10">
      <Link href="/accounts" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors shrink-0 flex items-center">
        <ArrowLeft className="w-5 h-5 text-zinc-400" />
      </Link>
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
  // (implementation omitted for brevity)
}


