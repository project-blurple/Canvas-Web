CREATE VIEW canvas_stats AS
SELECT
  canvas_id,
  COUNT(*)::integer AS total_users,
  SUM(total_pixels)::integer AS total_pixels,
  MAX(most_recent_timestamp) AS last_placed_at
FROM
  user_stats
GROUP BY
  canvas_id;

CREATE VIEW event_stats AS
SELECT
  c.event_id,
  COUNT(DISTINCT us.user_id)::integer AS total_users,
  SUM(us.total_pixels)::integer AS total_pixels
FROM
  user_stats us
  JOIN canvas c ON c.id = us.canvas_id
WHERE
  c.event_id IS NOT NULL
GROUP BY
  c.event_id;
