CREATE TABLE "evaluation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" uuid NOT NULL,
	"registered_model_id" uuid,
	"model" text NOT NULL,
	"domain" text NOT NULL,
	"spec" text NOT NULL,
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"sources" text,
	"summary" text NOT NULL,
	"factuality" integer NOT NULL,
	"specificity" integer NOT NULL,
	"hallucination_rate" integer NOT NULL,
	"confidence" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"claims" jsonb NOT NULL,
	"stages" jsonb NOT NULL,
	"improvements" jsonb NOT NULL,
	"transcript" jsonb,
	"retrieved_evidence" jsonb
);
--> statement-breakpoint
CREATE TABLE "evidence_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registered_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" uuid NOT NULL,
	"model" text NOT NULL,
	"domain" text NOT NULL,
	"audience" text NOT NULL,
	"spec" text NOT NULL,
	"domain_summary" text NOT NULL,
	"stages" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_runs" ADD CONSTRAINT "evaluation_runs_registered_model_id_registered_models_id_fk" FOREIGN KEY ("registered_model_id") REFERENCES "public"."registered_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_chunks" ADD CONSTRAINT "evidence_chunks_document_id_evidence_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."evidence_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_chunks" ADD CONSTRAINT "evidence_chunks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_documents" ADD CONSTRAINT "evidence_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registered_models" ADD CONSTRAINT "registered_models_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;