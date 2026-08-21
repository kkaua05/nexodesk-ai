export interface AgendaEntry {
  id: string;
  title: string;
  type: string;
  startAt: string;
  endAt?: string | null;
  customerId?: string | null;
  projectId?: string | null;
  valueCents?: number;
  source: "calendar" | "receivable" | "payable";
}
