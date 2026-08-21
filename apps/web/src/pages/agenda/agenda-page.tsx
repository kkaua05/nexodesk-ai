import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCents, formatDate, formatTime } from "@/lib/format";
import { useAgenda } from "@/hooks/use-agenda";

const TYPE_ICON: Record<string, string> = {
  reuniao: "🤝",
  ligacao: "📞",
  follow_up: "🔁",
  pagamento: "💰",
  vencimento: "⚠️",
  entrega: "📦",
  tarefa: "✅",
  projeto: "🚀",
  atendimento: "💬",
};

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function AgendaPage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { from, to, days } = useMemo(() => {
    const base = startOfWeek(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    const end = new Date(base);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const dayList = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return d;
    });
    return { from: base, to: end, days: dayList };
  }, [weekOffset]);

  const { data: entries } = useAgenda(from, to);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(from)} — {formatDate(to)}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
        {days.map((day) => {
          const dayEntries = (entries ?? []).filter((e) => new Date(e.startAt).toDateString() === day.toDateString());
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <Card key={day.toISOString()} className={isToday ? "border-primary/40" : undefined}>
              <CardContent className="p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  {day.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}
                </p>
                <div className="space-y-1.5">
                  {dayEntries.length === 0 && <p className="text-xs text-muted-foreground/60">—</p>}
                  {dayEntries.map((entry) => (
                    <div key={`${entry.source}-${entry.id}`} className="rounded-md bg-muted/50 p-2 text-xs">
                      <p className="font-medium">
                        {TYPE_ICON[entry.type] ?? "•"} {entry.title}
                      </p>
                      <p className="text-muted-foreground">{formatTime(entry.startAt)}</p>
                      {entry.valueCents !== undefined && <p className="font-medium text-primary">{formatCents(entry.valueCents)}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
