import { useParams } from "react-router-dom";
import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCents, formatDate } from "@/lib/format";
import { useProject, useUpdateProjectStatus, useUpdateProjectProgress, useCompleteProjectStage } from "@/hooks/use-projects";
import { PROJECT_STATUS } from "@nexodesk/shared";
import type { ProjectStatus } from "@nexodesk/shared";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planejamento: "Planejamento",
  aguardando_cliente: "Aguardando cliente",
  design: "Design",
  desenvolvimento: "Desenvolvimento",
  revisao: "Revisão",
  publicacao: "Publicação",
  concluido: "Concluído",
  pausado: "Pausado",
  cancelado: "Cancelado",
};

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useProject(id);
  const updateStatus = useUpdateProjectStatus();
  const updateProgress = useUpdateProjectProgress();
  const completeStage = useCompleteProjectStage();

  if (!project) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">{project.valueCents ? formatCents(project.valueCents) : "—"}</p>
            </div>
            <Select value={project.status} onValueChange={(value) => updateStatus.mutate({ id: project.id, status: value as ProjectStatus })}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>{project.progress}%</span>
            </div>
            <Progress value={project.progress} />
            <input
              type="range"
              min={0}
              max={100}
              value={project.progress}
              onChange={(e) => updateProgress.mutate({ id: project.id, progress: Number(e.target.value) })}
              className="mt-2 w-full accent-primary"
            />
          </div>
          {project.dueDate && <p className="text-xs text-muted-foreground">Prazo: {formatDate(project.dueDate)}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Etapas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {project.stages
              .sort((a, b) => a.order - b.order)
              .map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => !stage.completedAt && completeStage.mutate(stage.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted/50"
                >
                  {stage.completedAt ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span className={stage.completedAt ? "text-muted-foreground line-through" : ""}>{stage.name}</span>
                </button>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Tarefas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.tasks.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa.</p>}
            {project.tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted/50">
                <span>{task.title}</span>
                <Badge variant="secondary">{task.status.replaceAll("_", " ")}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
