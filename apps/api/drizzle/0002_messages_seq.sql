DROP INDEX "messages_chat_id_created_at_idx";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "seq" integer NOT NULL GENERATED ALWAYS AS IDENTITY (sequence name "messages_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1);--> statement-breakpoint
CREATE INDEX "messages_chat_id_seq_idx" ON "messages" USING btree ("chat_id","seq");