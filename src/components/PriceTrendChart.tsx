import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Sparkles, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
    Legend
} from "recharts";
import { PriceTrendData, TrendAnalysis } from "@/services/mandiPriceService";

interface PriceTrendChartProps {
    trendData: PriceTrendData[];
    analysis: TrendAnalysis;
    productName: string;
    className?: string;
}

export function PriceTrendChart({
    trendData,
    analysis,
    productName,
    className
}: PriceTrendChartProps) {
    const [timeRange, setTimeRange] = useState<7 | 30>(7);
    const [showVolume, setShowVolume] = useState(true);

    // Format data for chart
    const chartData = trendData.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric'
        }),
        price: item.modalPrice,
        minPrice: item.minPrice,
        maxPrice: item.maxPrice,
        volume: item.volume,
        confidence: Math.round(item.confidence * 100)
    }));

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="glass-card p-3 border border-border/50 shadow-lg">
                    <p className="text-xs font-semibold text-foreground mb-2">{data.date}</p>
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-primary">
                            Price: ₹{data.price.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Range: ₹{data.minPrice} - ₹{data.maxPrice}
                        </p>
                        {showVolume && (
                            <p className="text-xs text-muted-foreground">
                                Volume: {data.volume} quintals
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Confidence: {data.confidence}%
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Trend icon and color
    const getTrendIcon = () => {
        if (analysis.direction === 'rising') return TrendingUp;
        if (analysis.direction === 'falling') return TrendingDown;
        return Minus;
    };

    const getTrendColor = () => {
        if (analysis.direction === 'rising') return 'text-success';
        if (analysis.direction === 'falling') return 'text-destructive';
        return 'text-muted-foreground';
    };

    const getTrendBgColor = () => {
        if (analysis.direction === 'rising') return 'bg-success/10';
        if (analysis.direction === 'falling') return 'bg-destructive/10';
        return 'bg-muted/50';
    };

    const TrendIcon = getTrendIcon();

    return (
        <div className={cn("glass-card p-6", className)}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar size={18} className="text-primary" />
                        <h3 className="font-bold text-foreground text-lg">Price Trend Analysis</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Historical price movement for {productName}
                    </p>
                </div>

                {/* Time Range Selector */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setTimeRange(7)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            timeRange === 7
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                    >
                        7 Days
                    </button>
                    <button
                        onClick={() => setTimeRange(30)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            timeRange === 30
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                    >
                        30 Days
                    </button>
                </div>
            </div>

            {/* Trend Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className={cn("p-3 rounded-xl", getTrendBgColor())}>
                    <div className="flex items-center gap-2 mb-1">
                        <TrendIcon size={16} className={getTrendColor()} />
                        <p className="text-xs font-medium text-muted-foreground">Trend</p>
                    </div>
                    <p className={cn("text-lg font-bold capitalize", getTrendColor())}>
                        {analysis.direction}
                    </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Change</p>
                    <p className={cn(
                        "text-lg font-bold",
                        analysis.percentageChange >= 0 ? "text-success" : "text-destructive"
                    )}>
                        {analysis.percentageChange >= 0 ? "+" : ""}{analysis.percentageChange}%
                    </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Volatility</p>
                    <p className={cn(
                        "text-lg font-bold capitalize",
                        analysis.volatility === 'low' && "text-success",
                        analysis.volatility === 'medium' && "text-amber-500",
                        analysis.volatility === 'high' && "text-destructive"
                    )}>
                        {analysis.volatility}
                    </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Confidence</p>
                    <p className="text-lg font-bold text-primary">
                        {Math.round(analysis.confidence * 100)}%
                    </p>
                </div>
            </div>

            {/* Price Chart */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-foreground">Price Movement (₹/quintal)</p>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showVolume}
                            onChange={(e) => setShowVolume(e.target.checked)}
                            className="rounded"
                        />
                        Show Volume
                    </label>
                </div>

                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                            dataKey="date"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            tickFormatter={(value) => `₹${value}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="price"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="url(#priceGradient)"
                            dot={{ fill: "hsl(var(--primary))", r: 4 }}
                            activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Volume Chart */}
            {showVolume && (
                <div className="mb-6">
                    <p className="text-sm font-medium text-foreground mb-3">Market Volume (quintals)</p>
                    <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis
                                dataKey="date"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                    fontSize: '12px'
                                }}
                            />
                            <Bar
                                dataKey="volume"
                                fill="hsl(var(--primary))"
                                opacity={0.6}
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* AI Insight */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Sparkles size={16} className="text-primary" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-foreground text-sm mb-1">
                            AI Price Prediction
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {analysis.recommendation}
                        </p>
                        {analysis.priceRange && (
                            <div className="mt-3 flex items-center gap-4 text-xs">
                                <div>
                                    <span className="text-muted-foreground">Period Low: </span>
                                    <span className="font-bold text-destructive">
                                        ₹{analysis.priceRange.min.toLocaleString()}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Period High: </span>
                                    <span className="font-bold text-success">
                                        ₹{analysis.priceRange.max.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Data Source Note */}
            <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                    Data sourced from AGMARKNET (Ministry of Agriculture, Govt. of India) •
                    Updated daily • Confidence: {Math.round(analysis.confidence * 100)}%
                </p>
            </div>
        </div>
    );
}
