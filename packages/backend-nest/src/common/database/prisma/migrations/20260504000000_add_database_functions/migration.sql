-- CreateFunction clear_idle_sessions
CREATE FUNCTION public.clear_idle_sessions() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    session_record pg_stat_activity%ROWTYPE;
    num_sessions_terminated INTEGER := 0;
BEGIN
    -- Query to identify idle sessions older than 3 minutes
    FOR session_record IN SELECT * FROM pg_stat_activity WHERE state = 'idle' AND state_change < NOW() - INTERVAL '3 minutes' LOOP
        -- Terminate idle sessions
        EXECUTE 'SELECT pg_terminate_backend(' || session_record.pid || ')';
        num_sessions_terminated := num_sessions_terminated + 1;
    END LOOP;

    -- Return the number of sessions terminated
    RETURN num_sessions_terminated;
END;
$$;

ALTER FUNCTION public.clear_idle_sessions() OWNER TO postgres;

-- CreateFunction delete_surpassed_cooldowns
CREATE FUNCTION public.delete_surpassed_cooldowns() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM cooldown
    WHERE cooldown_time is not null and cooldown_time < NOW();
END;
$$;

ALTER FUNCTION public.delete_surpassed_cooldowns() OWNER TO postgres;
