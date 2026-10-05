BEGIN;
CREATE TABLE "ProductRoute" (
  "id" UUID NOT NULL,
  "value" TEXT NOT NULL,
  "contentId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductRoute_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductRoute_contentId_fkey" FOREIGN KEY ("contentId")
    REFERENCES "ContentEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProductRoute_value_check" CHECK (
    length("value") BETWEEN 1 AND 120 AND "value" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  )
);
CREATE UNIQUE INDEX "ProductRoute_value_key" ON "ProductRoute"("value");
CREATE INDEX "ProductRoute_contentId_idx" ON "ProductRoute"("contentId");

-- Canonical and historical routes share one namespace. Keep reservations after archive.
CREATE FUNCTION reserve_product_route(route_value TEXT, owner_id UUID) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE claimed INTEGER;
BEGIN
  INSERT INTO "ProductRoute" ("id", "value", "contentId")
    VALUES (gen_random_uuid(), route_value, owner_id)
    ON CONFLICT ("value") DO UPDATE SET "value" = EXCLUDED."value"
    WHERE "ProductRoute"."contentId" = EXCLUDED."contentId";
  GET DIAGNOSTICS claimed = ROW_COUNT;
  IF claimed = 0 THEN
    RAISE EXCEPTION 'Product route is reserved by another record'
      USING ERRCODE = '23505', CONSTRAINT = 'ProductRoute_value_key';
  END IF;
END;
$$;
CREATE FUNCTION validate_product_route() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "ContentEntry" WHERE "id" = NEW."contentId" AND "kind" = 'PRODUCT') THEN
    RAISE EXCEPTION 'Product routes require a product' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW."contentId" <> OLD."contentId" OR NEW."value" <> OLD."value") THEN
    RAISE EXCEPTION 'Product route reservations cannot be reassigned' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ProductRoute_validate" BEFORE INSERT OR UPDATE ON "ProductRoute"
  FOR EACH ROW EXECUTE FUNCTION validate_product_route();

CREATE FUNCTION reserve_product_routes() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."kind" = 'PRODUCT' AND NEW."kind" <> OLD."kind" THEN
    RAISE EXCEPTION 'Product kind cannot change' USING ERRCODE = '23514';
  END IF;
  IF NEW."kind" = 'PRODUCT' THEN
    PERFORM reserve_product_route(NEW."slug", NEW."id");
    PERFORM reserve_product_route(NEW."id"::TEXT, NEW."id");
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "ContentEntry_reserve_product_routes" AFTER INSERT OR UPDATE OF "slug", "kind" ON "ContentEntry"
  FOR EACH ROW EXECUTE FUNCTION reserve_product_routes();

DO $$
DECLARE entry RECORD;
BEGIN
  FOR entry IN SELECT "id", "slug" FROM "ContentEntry" WHERE "kind" = 'PRODUCT' LOOP
    PERFORM reserve_product_route(entry."slug", entry."id");
    PERFORM reserve_product_route(entry."id"::TEXT, entry."id");
  END LOOP;
END;
$$;
COMMIT;
