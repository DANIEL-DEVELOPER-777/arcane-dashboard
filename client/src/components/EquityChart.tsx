import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
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
             {["1D", "1W", "1M", "1Y", "ALL"].map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p as any)}
                className={clsx(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all",
                  activePeriod === p 
                    ? "bg-white text-black" 
                    : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
                )}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  // Prepare numeric timestamp field for better domain control (so 'ALL' can span from earliest trade)
  const parseTimestampMs = (t: any) => {
    // If timestamp is a number, assume seconds when it's small (< 1e12), otherwise milliseconds
    if (typeof t === 'number') return t > 1e12 ? t : t * 1000;
    // If string of digits, treat similarly
    if (typeof t === 'string') {
      if (/^\d+$/.test(t)) {
        const n = Number(t);
        return n > 1e12 ? n : n * 1000;
      }
      // ISO date string
      return new Date(t).getTime();
    }
    // Fallback
    return new Date(t).getTime();
  };

  const numericData = data ? data.map(d => ({ ...d, ts: parseTimestampMs(d.timestamp) })) : undefined;
  // Ensure points are sorted by timestamp so domain starts at the exact first trade
  const sortedData = numericData ? [...numericData].sort((a,b) => (a.ts! - b.ts!)) : undefined;

  return (
    <div className="glass-panel rounded-3xl p-4 md:p-8 relative overflow-hidden group">
      {/* Header with period toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 md:mb-8 gap-4">
        <div>
        </div>
        
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
              tickFormatter={(val) => format(new Date(Number(val)), activePeriod === "1D" ? "HH:mm" : (activePeriod === "ALL" ? "MMM yyyy" : "MMM d"))}
              minTickGap={20}
              domain={["dataMin", "dataMax"]}
              type="number"
            />
            <YAxis 
              hide
              domain={['auto', 'auto']}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 p-2 md:p-3 rounded-xl shadow-2xl">
                      <p className="text-zinc-400 text-[10px] md:text-xs mb-1">{format(new Date(label), "MMM d, HH:mm")}</p>
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
