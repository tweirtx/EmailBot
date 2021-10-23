CREATE TABLE IF NOT EXISTS allowed_domains (
    domain VARCHAR,
    guild_id BIGINT,
    PRIMARY KEY (domain, guild_id)
);
CREATE TABLE IF NOT EXISTS on_verif (
    guild_id BIGINT PRIMARY KEY,
    notif_channel BIGINT,
    role BIGINT
);
CREATE TABLE IF NOT EXISTS verified_users (
    user_id BIGINT,
    email VARCHAR,
    PRIMARY KEY (user_id, email)
)
