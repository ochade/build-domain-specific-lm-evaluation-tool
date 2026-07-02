CREATE TABLE "llm_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" uuid,
	"route" text NOT NULL,
	"model" text NOT NULL,
	"success" boolean NOT NULL,
	"error_message" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"estimated_cost_usd" real,
	"latency_ms" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;