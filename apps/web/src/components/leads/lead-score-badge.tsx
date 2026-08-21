import { temperatureFromScore } from "@nexodesk/shared";
import { cn } from "@/lib/utils";

const TEMPERATURE_STYLE: Record<string, string> = {
  frio: "bg-muted text-muted-foreground",
  morno: "bg-warning/15 text-warning-foreground",
  quente: "bg-orange-500/10 text-orange-600",
  muito_quente: "bg-destructive/10 text-destructive",
};

const TEMPERATURE_EMOJI: Record<string, string> = {
  frio: "❄️",
  morno: "🌤️",
  quente: "🔥",
  muito_quente: "🔥",
};

export function LeadScoreBadge({ score }: { score: number }) {
  const temperature = temperatureFromScore(score);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", TEMPERATURE_STYLE[temperature])}>
      {TEMPERATURE_EMOJI[temperature]} {score}
    </span>
  );
}
