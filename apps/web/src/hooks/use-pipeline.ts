import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useSocketEvent } from "@/lib/socket";
import type { PipelineStage } from "@nexodesk/shared";
import type { Contact } from "@/hooks/use-conversations";
import type { Lead, Service } from "@/hooks/use-leads";

export interface PipelineOpportunity {
  opportunity: { id: string; leadId: string; stageKey: PipelineStage; valueCents: number | null; order: number };
  lead?: Lead;
  contact?: Contact;
  service?: Service;
}

export interface PipelineStageColumn {
  stage: { id: string; key: PipelineStage; label: string; order: number };
  opportunities: PipelineOpportunity[];
}

export function usePipeline() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["pipeline"], queryFn: () => api.get<PipelineStageColumn[]>("/pipeline") });

  useSocketEvent("opportunity.moved", () => queryClient.invalidateQueries({ queryKey: ["pipeline"] }));
  useSocketEvent("lead.created", () => queryClient.invalidateQueries({ queryKey: ["pipeline"] }));

  return query;
}

export function useMoveOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, toStage, order }: { id: string; toStage: PipelineStage; order: number }) => api.patch(`/pipeline/opportunities/${id}/move`, { toStage, order }),
    onMutate: async ({ id, toStage }) => {
      await queryClient.cancelQueries({ queryKey: ["pipeline"] });
      const previous = queryClient.getQueryData<PipelineStageColumn[]>(["pipeline"]);
      if (previous) {
        queryClient.setQueryData<PipelineStageColumn[]>(
          ["pipeline"],
          previous.map((column) => ({
            ...column,
            opportunities: column.opportunities.filter((o) => o.opportunity.id !== id),
          })).map((column) => {
            if (column.stage.key !== toStage) return column;
            const moved = previous.flatMap((c) => c.opportunities).find((o) => o.opportunity.id === id);
            if (!moved) return column;
            return { ...column, opportunities: [...column.opportunities, { ...moved, opportunity: { ...moved.opportunity, stageKey: toStage } }] };
          }),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["pipeline"], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["pipeline"] }),
  });
}
