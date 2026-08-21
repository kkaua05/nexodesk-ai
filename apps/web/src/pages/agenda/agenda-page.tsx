import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCents, formatDate, formatDateTime, formatTime } from "@/lib/format";
import { useAgenda } from "@/hooks/use-agenda";
import type { AgendaEntry } from "./types";

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

type ViewMode = "mes" | "semana" | "lista";

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonthGrid(date: Date) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  return startOfWeek(firstOfMonth);
}

export function AgendaPage() {
  const [view, setView] = useState<ViewMode>("semana");
  const [offset, setOffset] = useState(0);

  const { from, to, days, label } = useMemo(() => {
    const now = new Date();

    if (view === "lista") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);
      return { from: start, to: end, days: [], label: "Próximos 30 dias" };
    }

    if (view === "mes") {
      const anchor = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const gridStart = startOfMonthGrid(anchor);
      const gridEnd = new Date(gridStart);
      gridEnd.setDate(gridEnd.getDate() + 41); // 6 weeks
      gridEnd.setHours(23, 59, 59, 999);
      const dayList = Array.from({ length: 42 }, (_, i) => {
        const d = new Date(gridStart);
        d.setDate(d.getDate() + i);
        return d;
      });
      return { from: gridStart, to: gridEnd, days: dayList, label: anchor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) };
    }

    const base = startOfWeek(now);
    base.setDate(base.getDate() + offset * 7);
    const end = new Date(base);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const dayList = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return d;
    });
    return { from: base, to: end, days: dayList, label: `${formatDate(base)} — ${formatDate(end)}` };
  }, [view, offset]);

  const { data: entries } = useAgenda(from, to);
  const currentMonth = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth() + (view === "mes" ? offset : 0), 1).getMonth(), [view, offset]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm capitalize text-muted-foreground">{label}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border/60 p-0.5">
            {(["mes", "semana", "lista"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setView(mode);
                  setOffset(0);
                }}
                className={cn("rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors", view === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {mode}
              </button>
            ))}
          </div>
          {view !== "lista" && (
            <div className="flex gap-1">
              <Button variant="outline" size="icon" onClick={() => setOffset((w) => w - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setOffset(0)}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={() => setOffset((w) => w + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {view === "lista" ? (
        <ListView entries={entries ?? []} />
      ) : view === "mes" ? (
        <MonthGrid days={days} entries={entries ?? []} currentMonth={currentMonth} />
      ) : (
        <WeekGrid days={days} entries={entries ?? []} />
      )}
    </div>
  );
}

function WeekGrid({ days, entries }: { days: Date[]; entries: AgendaEntry[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
      {days.map((day) => {
        const dayEntries = entries.filter((e) => new Date(e.startAt).toDateString() === day.toDateString());
        const isToday = day.toDateString() === new Date().toDateString();
        return (
          <Card key={day.toISOString()} className={isToday ? "border-primary/40" : undefined}>
            <CardContent className="p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">{day.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}</p>
              <div className="space-y-1.5">
                {dayEntries.length === 0 && <p className="text-xs text-muted-foreground/60">—</p>}
                {dayEntries.map((entry) => (
                  <EntryChip key={`${entry.source}-${entry.id}`} entry={entry} />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MonthGrid({ days, entries, currentMonth }: { days: Date[]; entries: AgendaEntry[]; currentMonth: number }) {
  const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/40">
        {weekdayLabels.map((label) => (
          <div key={label} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEntries = entries.filter((e) => new Date(e.startAt).toDateString() === day.toDateString());
          const isToday = day.toDateString() === new Date().toDateString();
          const isOtherMonth = day.getMonth() !== currentMonth;
          return (
            <div key={day.toISOString()} className={cn("min-h-[92px] border-b border-r border-border/40 p-1.5", isOtherMonth && "bg-muted/20")}>
              <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-xs", isToday && "bg-primary font-semibold text-primary-foreground", isOtherMonth && "text-muted-foreground/50")}>
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-1">
                {dayEntries.slice(0, 3).map((entry) => (
                  <div key={`${entry.source}-${entry.id}`} className="truncate rounded bg-muted/60 px-1 py-0.5 text-[10px]" title={entry.title}>
                    {TYPE_ICON[entry.type] ?? "•"} {entry.title}
                  </div>
                ))}
                {dayEntries.length > 3 && <p className="text-[10px] text-muted-foreground">+{dayEntries.length - 3} mais</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ entries }: { entries: AgendaEntry[] }) {
  const sorted = [...entries].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return (
    <Card>
      <CardContent className="divide-y divide-border/60 p-0">
        {sorted.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nada agendado nos próximos dias.</p>}
        {sorted.map((entry) => (
          <div key={`${entry.source}-${entry.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">
                {TYPE_ICON[entry.type] ?? "•"} {entry.title}
              </p>
              <p className="text-xs text-muted-foreground">{formatDateTime(entry.startAt)}</p>
            </div>
            {entry.valueCents !== undefined && <span className="font-medium text-primary">{formatCents(entry.valueCents)}</span>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EntryChip({ entry }: { entry: AgendaEntry }) {
  return (
    <div className="rounded-md bg-muted/50 p-2 text-xs">
      <p className="font-medium">
        {TYPE_ICON[entry.type] ?? "•"} {entry.title}
      </p>
      <p className="text-muted-foreground">{formatTime(entry.startAt)}</p>
      {entry.valueCents !== undefined && <p className="font-medium text-primary">{formatCents(entry.valueCents)}</p>}
    </div>
  );
}
