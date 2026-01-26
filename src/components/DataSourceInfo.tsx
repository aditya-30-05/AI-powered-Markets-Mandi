import { Info, Database, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataSourceInfoProps {
  dataSource?: string;
  lastUpdated?: string;
  marketCount?: number;
  confidence?: 'high' | 'medium' | 'low';
  className?: string;
}

export function DataSourceInfo({ 
  dataSource = "AGMARKNET (Ministry of Agriculture, Govt. of India)",
  lastUpdated,
  marketCount,
  confidence = 'medium',
  className 
}: DataSourceInfoProps) {
  const confidenceConfig = {
    high: { color: 'text-success', bg: 'bg-success/10', label: 'High Reliability' },
    medium: { color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', label: 'Good Reliability' },
    low: { color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', label: 'Limited Data' }
  };

  const config = confidenceConfig[confidence];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Data Source Card */}
      <div className="glass-card p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
            <Database size={16} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm mb-1">Data Source</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {dataSource}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {lastUpdated && (
            <div className="flex items-center gap-2">
              <Calendar size={12} className="text-muted-foreground" />
              <span className="text-muted-foreground">
                Updated: {new Date(lastUpdated).toLocaleDateString('en-IN')}
              </span>
            </div>
          )}
          
          {marketCount && (
            <div className="flex items-center gap-2">
              <TrendingUp size={12} className="text-muted-foreground" />
              <span className="text-muted-foreground">
                {marketCount} markets
              </span>
            </div>
          )}
        </div>

        {/* Confidence Indicator */}
        <div className={cn("flex items-center gap-2 mt-3 px-3 py-2 rounded-lg", config.bg)}>
          <div className={cn("w-2 h-2 rounded-full", config.color.replace('text-', 'bg-'))} />
          <span className={cn("text-xs font-medium", config.color)}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Important Disclaimer */}
      <div className="glass-card p-4 border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800 dark:text-amber-200 text-sm mb-2">
              Important Notice
            </h4>
            <div className="space-y-2 text-xs text-amber-700 dark:text-amber-300">
              <p>
                • Prices are for <strong>guidance only</strong> and may not reflect real-time market conditions
              </p>
              <p>
                • Actual prices may vary based on quality, variety, and local market conditions
              </p>
              <p>
                • Always verify current rates with local mandis before making transactions
              </p>
              <p>
                • This AI system provides estimates based on available government data
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Government Data Attribution */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-muted/50 text-xs text-muted-foreground">
          <Info size={12} />
          <span>
            Powered by Open Government Data Platform India (data.gov.in)
          </span>
        </div>
      </div>
    </div>
  );
}