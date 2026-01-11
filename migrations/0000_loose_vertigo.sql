CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"balance" double precision DEFAULT 0 NOT NULL,
	"equity" double precision DEFAULT 0 NOT NULL,
	"profit" double precision DEFAULT 0 NOT NULL,
	"profit_percent" double precision DEFAULT 0 NOT NULL,
	"daily_profit" double precision DEFAULT 0 NOT NULL,
	"daily_profit_percent" double precision DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "accounts_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "equity_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"equity" double precision NOT NULL,
	"balance" double precision NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equity_snapshots" ADD CONSTRAINT "equity_snapshots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;