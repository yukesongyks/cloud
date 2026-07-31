CREATE TABLE "staff_employees" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"employee_no" text NOT NULL,
	"name" text NOT NULL,
	"department" text,
	"position" text,
	"phone" text,
	"email" text,
	"id_card_no" text,
	"status" integer DEFAULT 1 NOT NULL,
	"entry_date" date,
	"leave_date" date,
	"remark" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"gmt_create" timestamp with time zone DEFAULT now() NOT NULL,
	"gmt_modified" timestamp with time zone DEFAULT now() NOT NULL,
	"creator_id" text,
	"modifier_id" text
);
--> statement-breakpoint
CREATE TABLE "staff_cost_budgets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"employee_id" bigint NOT NULL,
	"budget_type" integer DEFAULT 1 NOT NULL,
	"period" text NOT NULL,
	"amount" numeric(14,2) NOT NULL,
	"currency" text DEFAULT 'CNY' NOT NULL,
	"remark" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"gmt_create" timestamp with time zone DEFAULT now() NOT NULL,
	"gmt_modified" timestamp with time zone DEFAULT now() NOT NULL,
	"creator_id" text,
	"modifier_id" text
);
--> statement-breakpoint
CREATE TABLE "staff_whitelists" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"employee_id" bigint NOT NULL,
	"wl_type" integer DEFAULT 1 NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"effective_date" date NOT NULL,
	"expire_date" date,
	"remark" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"gmt_create" timestamp with time zone DEFAULT now() NOT NULL,
	"gmt_modified" timestamp with time zone DEFAULT now() NOT NULL,
	"creator_id" text,
	"modifier_id" text
);
--> statement-breakpoint
CREATE TABLE "staff_import_tasks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"task_type" integer DEFAULT 1 NOT NULL,
	"file_name" text NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"fail_detail" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"gmt_create" timestamp with time zone DEFAULT now() NOT NULL,
	"gmt_modified" timestamp with time zone DEFAULT now() NOT NULL,
	"creator_id" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uk_staff_employee_org_no" ON "staff_employees" USING btree ("org_id","employee_no") WHERE "staff_employees"."is_deleted" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_staff_employee_org_status" ON "staff_employees" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "idx_staff_employee_org_department" ON "staff_employees" USING btree ("org_id","department");--> statement-breakpoint
CREATE INDEX "idx_staff_employee_org_name" ON "staff_employees" USING btree ("org_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_staff_budget_emp_period" ON "staff_cost_budgets" USING btree ("employee_id","budget_type","period") WHERE "staff_cost_budgets"."is_deleted" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_staff_budget_org_period" ON "staff_cost_budgets" USING btree ("org_id","period");--> statement-breakpoint
CREATE INDEX "idx_staff_budget_emp" ON "staff_cost_budgets" USING btree ("employee_id","is_deleted");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_staff_wl_emp_type" ON "staff_whitelists" USING btree ("employee_id","wl_type","is_deleted") WHERE "staff_whitelists"."is_deleted" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_staff_wl_org_status" ON "staff_whitelists" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "idx_staff_wl_emp" ON "staff_whitelists" USING btree ("employee_id","status");--> statement-breakpoint
CREATE INDEX "idx_staff_import_org_create" ON "staff_import_tasks" USING btree ("org_id","gmt_create");
