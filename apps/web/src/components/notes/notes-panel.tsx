import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { useNotes, useCreateNote, useDeleteNote } from "@/hooks/use-notes";

export function NotesPanel({ entityType, entityId }: { entityType: string; entityId: string | undefined }) {
  const { data: notes } = useNotes(entityType, entityId);
  const createNote = useCreateNote(entityType, entityId);
  const deleteNote = useDeleteNote(entityType, entityId);
  const [draft, setDraft] = useState("");

  function handleAdd() {
    if (!draft.trim()) return;
    createNote.mutate(draft.trim());
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escreva uma nota..." className="min-h-[60px] flex-1" />
        <Button onClick={handleAdd} disabled={createNote.isPending || !draft.trim()}>
          Adicionar
        </Button>
      </div>
      <div className="space-y-2">
        {(!notes || notes.length === 0) && <p className="text-sm text-muted-foreground">Nenhuma nota ainda.</p>}
        {notes?.map((note) => (
          <div key={note.id} className="flex items-start justify-between gap-2 rounded-lg bg-muted/40 p-3 text-sm">
            <div>
              <p>{note.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</p>
            </div>
            <button onClick={() => deleteNote.mutate(note.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
