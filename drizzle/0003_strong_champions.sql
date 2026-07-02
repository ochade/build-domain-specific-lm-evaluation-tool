CREATE TABLE "claim_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" uuid NOT NULL,
	"run_id" uuid NOT NULL,
	"claim_id" text NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"judge_verdict" text NOT NULL,
	"judge_confidence" integer NOT NULL,
	"human_verdict" text NOT NULL,
	"agrees" boolean NOT NULL,
	"note" text,
	CONSTRAINT "claim_reviews_run_id_claim_id_unique" UNIQUE("run_id","claim_id")
);
--> statement-breakpoint
ALTER TABLE "claim_reviews" ADD CONSTRAINT "claim_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_reviews" ADD CONSTRAINT "claim_reviews_run_id_evaluation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."evaluation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_reviews" ADD CONSTRAINT "claim_reviews_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;