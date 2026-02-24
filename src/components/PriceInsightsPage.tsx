import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, MapPin, Plus, Sparkles, Clock, BarChart3, MessageCircle, X, Phone, MessageSquare as ChatIcon, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { mandiPriceService, PriceTrendData, TrendAnalysis } from "@/services/mandiPriceService";
import { PriceTrendChart } from "@/components/PriceTrendChart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface MandiCardProps {
  name: string;
  distance: string;
  price: number;
  avgDiff: number;
  trend: "up" | "down" | "neutral";
  onConnect: () => void;
}

function MandiCard({ name, distance, price, avgDiff, trend, onConnect }: MandiCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="glass-card p-5 flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-foreground">{name}</h4>
          <p className="text-xs text-muted-foreground">{distance} away</p>
        </div>
        <TrendIcon size={18} className={trendColor} />
      </div>

      <div className="mb-3">
        <p className="text-2xl font-bold text-foreground">₹{price.toLocaleString()}</p>
        <p className={cn("text-xs font-medium", trendColor)}>
          {avgDiff > 0 ? "+" : ""}{avgDiff > 0 ? `₹${avgDiff}` : avgDiff < 0 ? `₹${avgDiff}` : "Matches"} {avgDiff !== 0 ? "from Avg" : "Avg"}
        </p>
      </div>

      <button
        onClick={onConnect}
        className={cn(
          "mt-auto w-full py-2.5 rounded-xl",
          "bg-primary/10 text-primary font-semibold text-sm",
          "hover:bg-primary/15 transition-colors tap-feedback"
        )}
      >
        Connect to Buyer
      </button>
    </div>
  );
}

interface AddMandiCardProps {
  onAdd: () => void;
}

function AddMandiCard({ onAdd }: AddMandiCardProps) {
  return (
    <button
      onClick={onAdd}
      className={cn(
        "h-full min-h-[160px] rounded-3xl",
        "border-2 border-dashed border-primary/30",
        "flex flex-col items-center justify-center gap-2",
        "text-primary hover:bg-primary/5 transition-colors tap-feedback"
      )}
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Plus size={20} className="text-primary" />
      </div>
      <p className="font-semibold text-sm">Add New Mandi</p>
      <p className="text-xs text-muted-foreground">Track custom location</p>
    </button>
  );
}

interface SentimentBarProps {
  label: string;
  value: number;
  status: string;
  statusColor: string;
}

function SentimentBar({ label, value, status, statusColor }: SentimentBarProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-foreground w-16">{label}</span>
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", statusColor)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={cn("text-sm font-bold w-16 text-right", statusColor.replace("bg-", "text-"))}>{status}</span>
    </div>
  );
}

interface PriceInsightsPageProps {
  productName: string;
  productVariant?: string;
  currentPrice: number;
  lowPrice: number;
  avgPrice: number;
  highPrice: number;
  priceChange: number;
  marketPosition: "good" | "average" | "low";
  onStartNegotiation: () => void;
  onBack: () => void;
}

export function PriceInsightsPage({
  productName,
  productVariant = "Hybrid",
  currentPrice,
  lowPrice,
  avgPrice,
  highPrice,
  priceChange,
  marketPosition,
  onStartNegotiation,
  onBack
}: PriceInsightsPageProps) {
  const [showTrends, setShowTrends] = useState(false);
  const [showRecordTrade, setShowRecordTrade] = useState(false);
  const [showBuyerConnect, setShowBuyerConnect] = useState<string | null>(null);
  const [showAddMandi, setShowAddMandi] = useState(false);
  const [trendData, setTrendData] = useState<PriceTrendData[]>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  const [tradeData, setTradeData] = useState({
    quantity: "",
    price: String(currentPrice),
    buyerName: "",
    notes: ""
  });
  const [newMandiData, setNewMandiData] = useState({
    name: "",
    distance: "",
    price: ""
  });

  // Load price trends on component mount
  useEffect(() => {
    loadPriceTrends();
  }, [productName]);

  const loadPriceTrends = async () => {
    setIsLoadingTrends(true);
    try {
      console.log('Loading price trends for:', productName);
      const trends = await mandiPriceService.getPriceTrends(
        productName.toLowerCase(),
        'delhi',
        7
      );
      console.log('Trends loaded:', trends.length, 'data points');
      const analysis = mandiPriceService.analyzeTrend(trends);
      console.log('Trend analysis:', analysis);
      setTrendData(trends);
      setTrendAnalysis(analysis);
    } catch (error) {
      console.error('Failed to load price trends:', error);
      toast({
        title: "Unable to load trends",
        description: "Using cached data",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTrends(false);
    }
  };

  interface MandiData {
    name: string;
    distance: string;
    price: number;
    avgDiff: number;
    trend: "up" | "down" | "neutral";
    buyers: string[];
  }

  const [customMandis, setCustomMandis] = useState<MandiData[]>([]);

  const priceRange = highPrice - lowPrice;
  const currentPosition = ((currentPrice - lowPrice) / priceRange) * 100;

  const positionLabels = {
    good: { text: "Good Price to Sell", color: "text-success" },
    average: { text: "Average Market Price", color: "text-primary" },
    low: { text: "Below Market Average", color: "text-destructive" }
  };

  const defaultMandis: MandiData[] = [
    { name: "Azadpur Mandi", distance: "12.4 km", price: 2720, avgDiff: 70, trend: "up" as const, buyers: ["Ramesh Traders", "Fresh Farms Co.", "Delhi Vegetables"] },
    { name: "Okhla Mandi", distance: "8.2 km", price: 2580, avgDiff: -70, trend: "down" as const, buyers: ["Okhla Fresh", "Green Valley", "Metro Veggies"] },
    { name: "Ghazipur Mandi", distance: "15.0 km", price: 2650, avgDiff: 0, trend: "neutral" as const, buyers: ["Ghazipur Traders", "East Delhi Produce"] },
  ];

  const nearbyMandis = [...defaultMandis, ...customMandis];

  // 7-day price trend data for drawer (legacy)
  const drawerTrendData = [
    { day: "Mon", price: 2400, volume: 120 },
    { day: "Tue", price: 2500, volume: 150 },
    { day: "Wed", price: 2450, volume: 130 },
    { day: "Thu", price: 2600, volume: 180 },
    { day: "Fri", price: 2550, volume: 160 },
    { day: "Sat", price: 2700, volume: 200 },
    { day: "Today", price: currentPrice, volume: 175 },
  ];

  const maxPriceDrawer = Math.max(...drawerTrendData.map(d => d.price));
  const minPriceDrawer = Math.min(...drawerTrendData.map(d => d.price));

  const handleRecordTrade = () => {
    if (!tradeData.quantity || !tradeData.price) {
      toast({
        title: "Missing information",
        description: "Please enter quantity and price",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "✅ Trade Recorded!",
      description: `${tradeData.quantity} units of ${productName} at ₹${tradeData.price}/unit`,
    });
    setShowRecordTrade(false);
    setTradeData({ quantity: "", price: String(currentPrice), buyerName: "", notes: "" });
  };

  const handleConnectBuyer = (buyerName: string) => {
    toast({
      title: "📞 Connecting to Buyer",
      description: `Initiating contact with ${buyerName}...`,
    });
    setShowBuyerConnect(null);
  };

  const handleAddMandi = () => {
    if (!newMandiData.name.trim() || !newMandiData.distance.trim() || !newMandiData.price.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const priceNum = parseInt(newMandiData.price);
    const diff = priceNum - avgPrice;
    const trend = diff > 50 ? "up" : diff < -50 ? "down" : "neutral";

    const newMandi: MandiData = {
      name: newMandiData.name.trim(),
      distance: newMandiData.distance.trim().includes("km") ? newMandiData.distance.trim() : `${newMandiData.distance.trim()} km`,
      price: priceNum,
      avgDiff: diff,
      trend: trend as "up" | "down" | "neutral",
      buyers: ["Local Traders", "Market Buyers"]
    };

    setCustomMandis(prev => [...prev, newMandi]);
    toast({
      title: "✅ Mandi Added!",
      description: `Now tracking ${newMandi.name}`,
    });
    setShowAddMandi(false);
    setNewMandiData({ name: "", distance: "", price: "" });
  };

  return (
    <div className="min-h-screen flex flex-col pb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <button onClick={onBack} className="text-primary font-medium hover:underline">Home</button>
        <span className="text-muted-foreground">›</span>
        <span className="text-muted-foreground">Market Discovery</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Today's Price Insights</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
              <TrendingUp size={12} />
              High Demand
            </span>
            <span className="text-sm text-muted-foreground">
              Real-time trade data for <span className="font-semibold text-foreground">{productName} ({productVariant})</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTrends(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl",
              "bg-card border border-border text-foreground font-medium text-sm",
              "hover:bg-muted/50 transition-colors tap-feedback"
            )}
          >
            <Clock size={16} />
            <span>View Trends</span>
          </button>
          <button
            onClick={() => setShowRecordTrade(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl",
              "bg-primary text-primary-foreground font-semibold text-sm",
              "shadow-md shadow-primary/20 hover:shadow-lg transition-all tap-feedback"
            )}
          >
            <Plus size={16} />
            <span>Record Trade</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Price Card - Takes 2 columns */}
        <div className="lg:col-span-2 glass-card-elevated p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Market Position</p>
              <h2 className={cn("text-2xl sm:text-3xl font-bold", positionLabels[marketPosition].color)}>
                "{positionLabels[marketPosition].text}"
              </h2>
            </div>
            <div className="text-right">
              <p className="text-3xl sm:text-4xl font-bold text-foreground">
                ₹{currentPrice.toLocaleString()}<span className="text-lg font-normal text-muted-foreground">/qnt</span>
              </p>
              <p className={cn(
                "text-sm font-bold flex items-center justify-end gap-1 mb-2",
                priceChange >= 0 ? "text-success" : "text-destructive"
              )}>
                {priceChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {priceChange >= 0 ? "+" : ""}{priceChange}%
              </p>
              <p className="text-xs text-muted-foreground max-w-[200px] text-right leading-relaxed">
                Based on real-time mandi trends in your region and current demand.
              </p>
            </div>
          </div>

          {/* Price Range Visualization */}
          <div className="relative mb-4">
            <div className="h-4 rounded-full overflow-hidden flex">
              <div className="flex-1 bg-destructive/60" />
              <div className="flex-1 bg-amber-400/60" />
              <div className="flex-1 bg-primary/60" />
              <div className="flex-1 bg-success/60" />
            </div>
            {/* Current Price Indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-foreground shadow-lg border-4 border-background transition-all duration-700"
              style={{ left: `calc(${Math.min(Math.max(currentPosition, 5), 95)}% - 10px)` }}
            />
          </div>

          <div className="flex justify-between text-xs font-medium">
            <div>
              <p className="text-muted-foreground">₹{lowPrice.toLocaleString()}</p>
              <p className="text-destructive">(LOW)</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">₹{avgPrice.toLocaleString()}</p>
              <p className="text-amber-500">(AVG)</p>
            </div>
            <div className="text-center">
              <p className="text-primary font-bold">CURRENT</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">₹{highPrice.toLocaleString()}</p>
              <p className="text-success">(HIGH)</p>
            </div>
          </div>
        </div>

        {/* AI Recommendation Card */}
        <div className="glass-card p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-primary" />
            </div>
            <h3 className="font-bold text-primary text-lg">AI Recommendation</h3>
          </div>
          <p className="text-foreground leading-relaxed">
            {trendAnalysis?.recommendation ||
              `"Market arrivals are low today. Prices are likely to hit ₹${(currentPrice + 100).toLocaleString()} by evening. We recommend waiting 2 more hours before selling."`
            }
          </p>
        </div>
      </div>

      {/* Price Trend Chart - Full Width */}
      {isLoadingTrends && (
        <div className="mb-8 glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading price trends...</p>
        </div>
      )}

      {!isLoadingTrends && trendData.length > 0 && trendAnalysis && (
        <div className="mb-8">
          <PriceTrendChart
            trendData={trendData}
            analysis={trendAnalysis}
            productName={productName}
          />
        </div>
      )}

      {!isLoadingTrends && trendData.length === 0 && (
        <div className="mb-8 glass-card p-6 text-center">
          <p className="text-muted-foreground">No trend data available for {productName}</p>
        </div>
      )}

      {/* Nearby Mandi Prices */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-foreground">Nearby Mandi Prices</h3>
          <button className="flex items-center gap-2 text-primary font-semibold text-sm hover:underline">
            <span>View Map</span>
            <MapPin size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {nearbyMandis.map((mandi, i) => (
            <MandiCard
              key={i}
              name={mandi.name}
              distance={mandi.distance}
              price={mandi.price}
              avgDiff={mandi.avgDiff}
              trend={mandi.trend}
              onConnect={() => setShowBuyerConnect(mandi.name)}
            />
          ))}
          <AddMandiCard onAdd={() => setShowAddMandi(true)} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Market Sentiment */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={18} className="text-primary" />
            <h3 className="font-bold text-foreground">Market Sentiment</h3>
          </div>
          <div className="space-y-4">
            <SentimentBar label="Demand" value={85} status="High" statusColor="bg-success" />
            <SentimentBar label="Supply" value={35} status="Low" statusColor="bg-amber-500" />
            <SentimentBar label="Quality" value={75} status="Premium" statusColor="bg-primary" />
          </div>
        </div>

        {/* Ready to Sell CTA */}
        <div className="glass-card p-6 flex flex-col">
          <h3 className="font-bold text-foreground text-lg mb-2">Ready to sell?</h3>
          <p className="text-muted-foreground text-sm mb-6 flex-1">
            Our AI assistant can help you negotiate with <span className="font-semibold text-foreground">12 verified buyers</span> in Azadpur Mandi right now.
          </p>
          <button
            onClick={onStartNegotiation}
            className={cn(
              "w-full flex items-center justify-center gap-3 py-4 rounded-xl",
              "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground",
              "font-bold text-base",
              "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
              "active:scale-[0.98] transition-all tap-feedback"
            )}
          >
            <MessageCircle size={20} />
            <span>Start AI Negotiation</span>
          </button>
        </div>
      </div>

      {/* View Trends Drawer */}
      <Drawer open={showTrends} onOpenChange={setShowTrends}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <BarChart3 size={20} className="text-primary" />
              7-Day Price Trend for {productName}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-6 pb-6">
            {/* Simple Chart */}
            <div className="h-48 flex items-end gap-2 mb-4">
              {drawerTrendData.map((data, i) => {
                const height = ((data.price - minPriceDrawer) / (maxPriceDrawer - minPriceDrawer)) * 100;
                const isToday = data.day === "Today";
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className={cn("text-xs font-bold", isToday ? "text-primary" : "text-muted-foreground")}>
                      ₹{data.price}
                    </span>
                    <div
                      className={cn(
                        "w-full rounded-t-lg transition-all",
                        isToday ? "bg-primary" : "bg-primary/40"
                      )}
                      style={{ height: `${Math.max(height, 10)}%` }}
                    />
                    <span className={cn("text-xs font-medium", isToday ? "text-primary" : "text-muted-foreground")}>
                      {data.day}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-muted/50">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Week Low</p>
                <p className="text-lg font-bold text-destructive">₹{minPriceDrawer}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Week Avg</p>
                <p className="text-lg font-bold text-foreground">₹{Math.round(drawerTrendData.reduce((a, b) => a + b.price, 0) / drawerTrendData.length)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Week High</p>
                <p className="text-lg font-bold text-success">₹{maxPriceDrawer}</p>
              </div>
            </div>

            {/* AI Insight */}
            <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm mb-1">AI Price Prediction</p>
                  <p className="text-sm text-muted-foreground">
                    Based on current trends, prices are expected to rise by <span className="font-bold text-success">₹50-100</span> over the next 2 days due to low supply.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Record Trade Dialog */}
      <Dialog open={showRecordTrade} onOpenChange={setShowRecordTrade}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-primary" />
              Record Trade
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Product</label>
              <div className="px-4 py-3 rounded-xl bg-muted text-foreground font-medium">
                {productName} ({productVariant})
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Quantity (units)</label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={tradeData.quantity}
                  onChange={(e) => setTradeData(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Price (₹/unit)</label>
                <input
                  type="number"
                  placeholder="e.g. 2650"
                  value={tradeData.price}
                  onChange={(e) => setTradeData(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Buyer Name (optional)</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Traders"
                value={tradeData.buyerName}
                onChange={(e) => setTradeData(prev => ({ ...prev, buyerName: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Notes (optional)</label>
              <textarea
                placeholder="Any additional notes..."
                value={tradeData.notes}
                onChange={(e) => setTradeData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
            <button
              onClick={handleRecordTrade}
              className={cn(
                "w-full py-3 rounded-xl",
                "bg-primary text-primary-foreground font-semibold",
                "hover:bg-primary/90 transition-colors tap-feedback"
              )}
            >
              Save Trade Record
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connect to Buyer Dialog */}
      <Dialog open={!!showBuyerConnect} onOpenChange={() => setShowBuyerConnect(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone size={20} className="text-primary" />
              Connect to Buyers at {showBuyerConnect}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select a verified buyer to connect with:
            </p>
            <div className="space-y-3">
              {nearbyMandis.find(m => m.name === showBuyerConnect)?.buyers.map((buyer, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold">{buyer.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{buyer}</p>
                      <p className="text-xs text-muted-foreground">Verified Buyer • Active now</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConnectBuyer(buyer)}
                      className="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-colors"
                    >
                      <Phone size={16} />
                    </button>
                    <button
                      onClick={() => {
                        toast({
                          title: "💬 Opening Chat",
                          description: `Starting conversation with ${buyer}...`,
                        });
                        setShowBuyerConnect(null);
                      }}
                      className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                    >
                      <ChatIcon size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Mandi Dialog */}
      <Dialog open={showAddMandi} onOpenChange={setShowAddMandi}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin size={20} className="text-primary" />
              Add New Mandi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Mandi Name</label>
              <input
                type="text"
                placeholder="e.g. Chandni Chowk Mandi"
                value={newMandiData.name}
                onChange={(e) => setNewMandiData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Distance</label>
                <input
                  type="text"
                  placeholder="e.g. 5.2 km"
                  value={newMandiData.distance}
                  onChange={(e) => setNewMandiData(prev => ({ ...prev, distance: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Current Price (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 2600"
                  value={newMandiData.price}
                  onChange={(e) => setNewMandiData(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                💡 <span className="font-medium text-foreground">Tip:</span> Add mandis you frequently visit to track their prices and connect with buyers.
              </p>
            </div>
            <button
              onClick={handleAddMandi}
              className={cn(
                "w-full py-3 rounded-xl",
                "bg-primary text-primary-foreground font-semibold",
                "hover:bg-primary/90 transition-colors tap-feedback"
              )}
            >
              Add Mandi
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
