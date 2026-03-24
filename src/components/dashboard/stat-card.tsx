import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: { value: number; positive: boolean };
  iconClassName?: string;
  iconBgClassName?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  iconClassName,
  iconBgClassName,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2 sm:gap-4 p-3 sm:p-6">
        <div
          className={cn(
            "flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg",
            iconBgClassName
          )}
        >
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconClassName)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg sm:text-2xl font-semibold tracking-tight">{value}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.positive ? "text-emerald-400" : "text-red-400"
            )}
          >
            {trend.positive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trend.positive ? "+" : ""}
            {trend.value}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}
