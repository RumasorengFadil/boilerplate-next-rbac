BEGIN;
ALTER TABLE "ContentEntry" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "ContentEntry_kind_deletedAt_status_publishedAt_idx"
  ON "ContentEntry"("kind", "deletedAt", "status", "publishedAt");

CREATE TABLE "PortfolioRoute" (
  "id" UUID NOT NULL,
  "value" TEXT NOT NULL,
  "contentId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortfolioRoute_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PortfolioRoute_contentId_fkey" FOREIGN KEY ("contentId")
    REFERENCES "ContentEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PortfolioRoute_value_check" CHECK (
    length("value") BETWEEN 1 AND 120 AND "value" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  )
);
CREATE UNIQUE INDEX "PortfolioRoute_value_key" ON "PortfolioRoute"("value");
CREATE INDEX "PortfolioRoute_contentId_idx" ON "PortfolioRoute"("contentId");

-- Canonical and historical routes share one namespace. Keep reservations after archive.
CREATE FUNCTION reserve_portfolio_route(route_value TEXT, owner_id UUID) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE claimed INTEGER;
BEGIN
  INSERT INTO "PortfolioRoute" ("id", "value", "contentId")
    VALUES (gen_random_uuid(), route_value, owner_id)
    ON CONFLICT ("value") DO UPDATE SET "value" = EXCLUDED."value"
    WHERE "PortfolioRoute"."contentId" = EXCLUDED."contentId";
  GET DIAGNOSTICS claimed = ROW_COUNT;
  IF claimed = 0 THEN
    RAISE EXCEPTION 'Portfolio route is reserved by another record'
      USING ERRCODE = '23505', CONSTRAINT = 'PortfolioRoute_value_key';
  END IF;
END;
$$;
CREATE FUNCTION validate_portfolio_route() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "ContentEntry" WHERE "id" = NEW."contentId" AND "kind" = 'CASE_STUDY') THEN
    RAISE EXCEPTION 'Portfolio routes require a case study' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW."contentId" <> OLD."contentId" OR NEW."value" <> OLD."value") THEN
    RAISE EXCEPTION 'Portfolio route reservations cannot be reassigned' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "PortfolioRoute_validate" BEFORE INSERT OR UPDATE ON "PortfolioRoute"
  FOR EACH ROW EXECUTE FUNCTION validate_portfolio_route();

CREATE FUNCTION reserve_case_study_routes() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."kind" = 'CASE_STUDY' AND NEW."kind" <> OLD."kind" THEN
    RAISE EXCEPTION 'Case study kind cannot change' USING ERRCODE = '23514';
  END IF;
  IF NEW."kind" = 'CASE_STUDY' THEN
    PERFORM reserve_portfolio_route(NEW."slug", NEW."id");
    PERFORM reserve_portfolio_route(NEW."id"::TEXT, NEW."id");
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ContentEntry_reserve_portfolio_routes" AFTER INSERT OR UPDATE OF "slug", "kind" ON "ContentEntry"
  FOR EACH ROW EXECUTE FUNCTION reserve_case_study_routes();

DO $$
DECLARE entry RECORD;
BEGIN
  FOR entry IN SELECT "id", "slug" FROM "ContentEntry" WHERE "kind" = 'CASE_STUDY' LOOP
    PERFORM reserve_portfolio_route(entry."slug", entry."id");
    PERFORM reserve_portfolio_route(entry."id"::TEXT, entry."id");
  END LOOP;
END;
$$;
COMMIT;
