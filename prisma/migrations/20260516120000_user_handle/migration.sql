-- AlterTable
ALTER TABLE "user" ADD COLUMN "handle" TEXT;

-- Backfill existing rows with a derived, unique handle.
-- Strategy: slugify(name) or email-local-part; on collision append -2, -3, ...
DO $$
DECLARE
  r RECORD;
  base_handle TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR r IN SELECT id, name, email FROM "user" WHERE handle IS NULL LOOP
    base_handle := lower(regexp_replace(coalesce(r.name, split_part(r.email, '@', 1)), '[^a-z0-9]+', '-', 'g'));
    base_handle := regexp_replace(base_handle, '^-+|-+$', '', 'g');
    IF length(base_handle) < 3 THEN
      base_handle := 'player-' || substring(r.id from 1 for 6);
    END IF;
    IF length(base_handle) > 20 THEN
      base_handle := substring(base_handle from 1 for 20);
    END IF;

    candidate := base_handle;
    suffix := 2;
    WHILE EXISTS (SELECT 1 FROM "user" WHERE handle = candidate) LOOP
      candidate := substring(base_handle from 1 for greatest(1, 20 - length(suffix::text) - 1)) || '-' || suffix::text;
      suffix := suffix + 1;
    END LOOP;

    UPDATE "user" SET handle = candidate WHERE id = r.id;
  END LOOP;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "user_handle_key" ON "user"("handle");
