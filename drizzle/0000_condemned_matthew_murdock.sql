CREATE TYPE "public"."directionality" AS ENUM('mutual', 'a_helps_b', 'b_helps_a', 'a_harms_b', 'b_harms_a');--> statement-breakpoint
CREATE TYPE "public"."evidence_tier" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."guild_layer" AS ENUM('canopy', 'understory', 'shrub', 'herbaceous', 'groundcover', 'root', 'vine');--> statement-breakpoint
CREATE TYPE "public"."mechanism" AS ENUM('pest_confusion', 'pest_trap', 'beneficial_insect_attraction', 'nitrogen_fixation', 'allelopathy', 'shade_structure', 'ground_cover_weed_suppression', 'nutrient_accumulation_claimed', 'disease_pressure', 'resource_competition', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."plant_type" AS ENUM('tree', 'shrub', 'vine', 'herb', 'vegetable', 'ground_cover');--> statement-breakpoint
CREATE TYPE "public"."relation_type" AS ENUM('beneficial', 'antagonistic', 'neutral');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('peer_reviewed', 'extension_service', 'horticultural_org', 'book', 'traditional');--> statement-breakpoint
CREATE TYPE "public"."sun" AS ENUM('full', 'partial', 'shade', 'adaptable');--> statement-breakpoint
CREATE TYPE "public"."water_level" AS ENUM('dry', 'medium', 'wet');--> statement-breakpoint
CREATE TABLE "plants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"common_name" text NOT NULL,
	"scientific_name" text NOT NULL,
	"type" "plant_type" NOT NULL,
	"guild_layer" "guild_layer",
	"functions" text[] DEFAULT '{}'::text[] NOT NULL,
	"edible_parts" text[] DEFAULT '{}'::text[] NOT NULL,
	"sun" "sun" NOT NULL,
	"water_min" "water_level" NOT NULL,
	"water_opt" "water_level" NOT NULL,
	"water_max" "water_level" NOT NULL,
	"ph_min" numeric(3, 1) NOT NULL,
	"ph_opt" numeric(3, 1) NOT NULL,
	"ph_max" numeric(3, 1) NOT NULL,
	"min_zone" smallint NOT NULL,
	"max_zone" smallint NOT NULL,
	"mature_height_cm" smallint,
	"spread_cm" smallint,
	"root_depth_cm" smallint,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plants_scientific_name_unique" UNIQUE("scientific_name"),
	CONSTRAINT "zone_range" CHECK ("plants"."min_zone" <= "plants"."max_zone"),
	CONSTRAINT "ph_range" CHECK ("plants"."ph_min" <= "plants"."ph_opt" and "plants"."ph_opt" <= "plants"."ph_max")
);
--> statement-breakpoint
CREATE TABLE "relationship_sources" (
	"relationship_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relationship_sources_pair_unique" UNIQUE("relationship_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plant_a_id" uuid NOT NULL,
	"plant_b_id" uuid NOT NULL,
	"relation_type" "relation_type" NOT NULL,
	"directionality" "directionality" NOT NULL,
	"mechanism" "mechanism",
	"evidence_tier" "evidence_tier" NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relationships_pair_unique" UNIQUE("plant_a_id","plant_b_id"),
	CONSTRAINT "canonical_pair_order" CHECK ("relationships"."plant_a_id" < "relationships"."plant_b_id")
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"publisher" text,
	"url" text,
	"source_type" "source_type" NOT NULL,
	"year" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zip_zones" (
	"zip" text PRIMARY KEY NOT NULL,
	"zone_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"code" text PRIMARY KEY NOT NULL,
	"min_temp_c" numeric(5, 1) NOT NULL,
	"max_temp_c" numeric(5, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "relationship_sources" ADD CONSTRAINT "relationship_sources_relationship_id_relationships_id_fk" FOREIGN KEY ("relationship_id") REFERENCES "public"."relationships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship_sources" ADD CONSTRAINT "relationship_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_plant_a_id_plants_id_fk" FOREIGN KEY ("plant_a_id") REFERENCES "public"."plants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_plant_b_id_plants_id_fk" FOREIGN KEY ("plant_b_id") REFERENCES "public"."plants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zip_zones" ADD CONSTRAINT "zip_zones_zone_code_zones_code_fk" FOREIGN KEY ("zone_code") REFERENCES "public"."zones"("code") ON DELETE no action ON UPDATE no action;