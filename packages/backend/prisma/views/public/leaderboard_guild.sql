SELECT
  history.user_id,
  history.canvas_id,
  history.guild_id,
  count(*) AS total_pixels,
  rank() OVER (
    PARTITION BY history.canvas_id,
    history.guild_id
    ORDER BY
      (count(*)) DESC
  ) AS rank
FROM
  history
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      blacklist
    WHERE
      blacklist.user_id = history.user_id
  )
GROUP BY
  history.user_id,
  history.canvas_id,
  history.guild_id;
