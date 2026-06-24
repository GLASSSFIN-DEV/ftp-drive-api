------------------------------------------ Folder ------------------------------------------
-- Drop old trigger and function if they exist
DROP TRIGGER IF EXISTS folder_name_fts_update ON "Folder";
DROP FUNCTION IF EXISTS folder_name_fts_trigger();

-- Optimized trigger function
CREATE OR REPLACE FUNCTION folder_name_fts_trigger()
RETURNS trigger AS $$
BEGIN
  -- Skip if folderName hasn't actually changed
  IF TG_OP = 'UPDATE' AND NEW."folderName" IS NOT DISTINCT FROM OLD."folderName" THEN
    RETURN NEW;
  END IF;

  NEW."folderNameFts" :=
    setweight(to_tsvector('indonesian', COALESCE(NEW."folderName", '')), 'A')
    ||
    setweight(
      to_tsvector(
        'indonesian',
        trim(regexp_replace(
          regexp_replace(COALESCE(NEW."folderName", ''), '[^a-zA-Z0-9 ]', ' ', 'g'),
          '\s+', ' ', 'g'
        ))
      ),
      'B'
    );

  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER folder_name_fts_update
BEFORE INSERT OR UPDATE OF "folderName"
ON "Folder"
FOR EACH ROW
EXECUTE FUNCTION folder_name_fts_trigger();

-- Backfill existing rows
UPDATE "Folder" SET "folderName" = "folderName";

------------------------------------------ File ------------------------------------------
-- Drop old trigger and function if they exist
DROP TRIGGER IF EXISTS file_name_fts_update ON "File";
DROP FUNCTION IF EXISTS file_name_fts_trigger();

-- Optimized trigger function
CREATE OR REPLACE FUNCTION file_name_fts_trigger()
RETURNS trigger AS $$
BEGIN
  -- Skip if folderName hasn't actually changed
  IF TG_OP = 'UPDATE' AND NEW."fileName" IS NOT DISTINCT FROM OLD."fileName" THEN
    RETURN NEW;
  END IF;

  NEW."fileNameFts" :=
    setweight(to_tsvector('indonesian', COALESCE(NEW."fileName", '')), 'A')
    ||
    setweight(
      to_tsvector(
        'indonesian',
        trim(regexp_replace(
          regexp_replace(COALESCE(NEW."fileName", ''), '[^a-zA-Z0-9 ]', ' ', 'g'),
          '\s+', ' ', 'g'
        ))
      ),
      'B'
    );

  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER file_name_fts_update
BEFORE INSERT OR UPDATE OF "fileName"
ON "File"
FOR EACH ROW
EXECUTE FUNCTION file_name_fts_trigger();

-- Backfill existing rows
UPDATE "File" SET "fileName" = "fileName";

------------------------------------------ FileVector ------------------------------------------
-- Drop old trigger and function if they exist
DROP TRIGGER IF EXISTS filevector_name_fts_update ON "FileVector";
DROP FUNCTION IF EXISTS filevector_name_fts_trigger();

-- Optimized trigger function
CREATE OR REPLACE FUNCTION filevector_name_fts_trigger()
RETURNS trigger AS $$
BEGIN
  -- Skip if folderName hasn't actually changed
  IF TG_OP = 'UPDATE' AND NEW."content" IS NOT DISTINCT FROM OLD."content" THEN
    RETURN NEW;
  END IF;

  NEW."contentFts" :=
    setweight(to_tsvector('indonesian', COALESCE(NEW."content", '')), 'A')
    ||
    setweight(
      to_tsvector(
        'indonesian',
        trim(regexp_replace(
          regexp_replace(COALESCE(NEW."content", ''), '[^a-zA-Z0-9 ]', ' ', 'g'),
          '\s+', ' ', 'g'
        ))
      ),
      'B'
    );

  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER filevector_name_fts_update
BEFORE INSERT OR UPDATE OF "content"
ON "FileVector"
FOR EACH ROW
EXECUTE FUNCTION filevector_name_fts_trigger();

-- Backfill existing rows
UPDATE "FileVector" SET "content" = "content";