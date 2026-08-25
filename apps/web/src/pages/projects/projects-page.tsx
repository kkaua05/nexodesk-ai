import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCents, formatDate } from "@/lib/format";
import { useProjects } from "@/hooks/use-projects";
import type { ProjectStatus } from "@nexodesk/shared";
import { CreateProjectDialog } from "./create-project-dialog";

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

export function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">Projetos cadastrados manualmente ou criados automaticamente a partir de vendas fechadas.</p>
        </div>
        <CreateProjectDialog />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!isLoading && (!projects || projects.length === 0) && <p className="text-sm text-muted-foreground">Nenhum projeto ainda.</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects?.map((project) => (
          <Link key={project.id} to={`/projetos/${project.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{project.name}</p>
                  <Badge variant="secondary" className="shrink-0">
                    {STATUS_LABEL[project.status]}
                  </Badge>
                </div>
                <Progress value={project.progress} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{project.valueCents ? formatCents(project.valueCents) : "—"}</span>
                  {project.dueDate && <span>Prazo: {formatDate(project.dueDate)}</span>}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
