DROP VIEW IF EXISTS most_frequent_color CASCADE;

DROP VIEW IF EXISTS color_place_frequency CASCADE;

DROP VIEW IF EXISTS most_frequent_color_guild CASCADE;

DROP VIEW IF EXISTS color_place_frequency_guild CASCADE;

DROP VIEW IF EXISTS leaderboard_guild CASCADE;

DROP VIEW IF EXISTS leaderboard CASCADE;

DROP VIEW IF EXISTS user_stats CASCADE;

DROP VIEW IF EXISTS guild_stats CASCADE;

CREATE VIEW most_frequent_color AS
SELECT DISTINCT
  ON (history.user_id, history.canvas_id) history.user_id,
  history.canvas_id,
  history.color_id,
  count(*) AS count
FROM
  history
GROUP BY
  history.user_id,
  history.color_id,
  history.canvas_id
ORDER BY
  history.user_id,
  history.canvas_id,
  (count(*)) DESC;

CREATE VIEW color_place_frequency AS
WITH
  time_diffs AS (
    SELECT
      history.user_id,
      history.canvas_id,
      (
        history."timestamp" - lag(history."timestamp") OVER (
          PARTITION BY
            history.user_id,
            history.canvas_id
          ORDER BY
            history."timestamp"
        )
      ) AS time_diff
    FROM
      history
    ORDER BY
      history."timestamp"
  )
SELECT
  t.user_id,
  t.canvas_id,
  percentile_cont((0.5)::double precision) WITHIN GROUP (
    ORDER BY
      t.time_diff
  ) AS median_time_diff
FROM
  time_diffs t
WHERE
  (t.time_diff > '00:00:00.1'::INTERVAL)
GROUP BY
  t.user_id,
  t.canvas_id
HAVING
  (count(*) > 1);

CREATE VIEW most_frequent_color_guild AS
SELECT DISTINCT
  ON (history.guild_id, history.canvas_id) history.guild_id,
  history.canvas_id,
  history.color_id,
  count(*) AS count
FROM
  history
GROUP BY
  history.guild_id,
  history.color_id,
  history.canvas_id
ORDER BY
  history.guild_id,
  history.canvas_id,
  (count(*)) DESC;

CREATE VIEW color_place_frequency_guild AS
WITH
  time_diffs AS (
    SELECT
      history.guild_id,
      history.canvas_id,
      (
        history."timestamp" - lag(history."timestamp") OVER (
          PARTITION BY
            history.guild_id,
            history.canvas_id
          ORDER BY
            history."timestamp"
        )
      ) AS time_diff
    FROM
      history
    ORDER BY
      history."timestamp"
  )
SELECT
  t.guild_id,
  t.canvas_id,
  percentile_cont((0.5)::double precision) WITHIN GROUP (
    ORDER BY
      t.time_diff
  ) AS median_time_diff
FROM
  time_diffs t
WHERE
  (t.time_diff > '00:00:00.05'::INTERVAL)
GROUP BY
  t.guild_id,
  t.canvas_id
HAVING
  (count(*) > 1);

CREATE VIEW leaderboard_guild AS
SELECT
  history.user_id,
  history.canvas_id,
  history.guild_id,
  count(*) AS total_pixels,
  rank() OVER (
    PARTITION BY
      history.canvas_id,
      history.guild_id
    ORDER BY
      (count(*)) DESC
  ) AS rank
FROM
  history
WHERE
  history.user_id NOT IN (
    SELECT
      user_id
    FROM
      blacklist
  )
GROUP BY
  history.user_id,
  history.canvas_id,
  history.guild_id;

CREATE VIEW leaderboard AS
SELECT
  leaderboard_guild.user_id,
  leaderboard_guild.canvas_id,
  (sum(leaderboard_guild.total_pixels))::integer AS total_pixels,
  rank() OVER (
    PARTITION BY
      leaderboard_guild.canvas_id
    ORDER BY
      (sum(leaderboard_guild.total_pixels)) DESC
  ) AS rank
FROM
  leaderboard_guild
GROUP BY
  leaderboard_guild.user_id,
  leaderboard_guild.canvas_id;

CREATE VIEW user_stats AS
SELECT
  lb.user_id,
  lb.canvas_id,
  lb.total_pixels,
  lb.rank,
  mfc.color_id AS most_frequent_color_id,
  mfc.count AS color_count,
  cpf.median_time_diff AS place_frequency,
  h.most_recent_timestamp
FROM
  (
    (
      (
        leaderboard lb
        LEFT JOIN most_frequent_color mfc ON (
          (
            (lb.canvas_id = mfc.canvas_id)
            AND (lb.user_id = mfc.user_id)
          )
        )
      )
      LEFT JOIN color_place_frequency cpf ON (
        (
          (lb.canvas_id = cpf.canvas_id)
          AND (lb.user_id = cpf.user_id)
        )
      )
    )
    LEFT JOIN (
      SELECT
        history.user_id,
        history.canvas_id,
        max(history."timestamp") AS most_recent_timestamp
      FROM
        history
      GROUP BY
        history.user_id,
        history.canvas_id
    ) h ON (
      (
        (lb.canvas_id = h.canvas_id)
        AND (lb.user_id = h.user_id)
      )
    )
  );

CREATE VIEW guild_stats AS
SELECT
  lb.guild_id,
  lb.canvas_id,
  lb.total_pixels,
  mfc.color_id AS most_frequent_color_id,
  mfc.count AS color_count,
  cpf.median_time_diff AS place_frequency,
  h.most_recent_timestamp
FROM
  (
    (
      (
        (
          SELECT
            leaderboard_guild.canvas_id,
            leaderboard_guild.guild_id,
            (sum(leaderboard_guild.total_pixels))::integer AS total_pixels
          FROM
            leaderboard_guild
          GROUP BY
            leaderboard_guild.canvas_id,
            leaderboard_guild.guild_id
        ) lb
        LEFT JOIN most_frequent_color_guild mfc ON (
          (
            (lb.canvas_id = mfc.canvas_id)
            AND (lb.guild_id = mfc.guild_id)
          )
        )
      )
      LEFT JOIN color_place_frequency_guild cpf ON (
        (
          (lb.canvas_id = cpf.canvas_id)
          AND (lb.guild_id = cpf.guild_id)
        )
      )
    )
    LEFT JOIN (
      SELECT
        history.guild_id,
        history.canvas_id,
        max(history.timestamp) AS most_recent_timestamp
      FROM
        history
      GROUP BY
        history.guild_id,
        history.canvas_id
    ) h ON (
      (
        (lb.canvas_id = h.canvas_id)
        AND (lb.guild_id = h.guild_id)
      )
    )
  );
