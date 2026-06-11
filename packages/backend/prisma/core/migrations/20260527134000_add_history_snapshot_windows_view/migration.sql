DROP VIEW IF EXISTS history_snapshot_windows CASCADE;

CREATE VIEW history_snapshot_windows AS
SELECT
  bucketed.canvas_id,
  bucketed.bucket_start,
  bucketed.bucket_start + INTERVAL '10 minutes' AS bucket_end,
  COUNT(*)::integer AS history_count
FROM (
  SELECT
    h.canvas_id,
    date_trunc('hour', h.timestamp AT TIME ZONE 'UTC')
      + (floor(extract(minute from h.timestamp AT TIME ZONE 'UTC') / 10) * INTERVAL '10 minutes') AS bucket_start
  FROM history h
  WHERE h.erased_at IS NULL
) bucketed
GROUP BY
  bucketed.canvas_id,
  bucketed.bucket_start;
