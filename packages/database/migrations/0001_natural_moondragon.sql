ALTER TABLE "ai_memories" DROP CONSTRAINT "ai_memories_source_conversation_id_conversations_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_memories" ADD CONSTRAINT "ai_memories_source_conversation_id_conversations_id_fk" FOREIGN KEY ("source_conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;