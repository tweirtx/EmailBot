CREATE TABLE IF NOT EXISTS allowed_domains (
    domain VARCHAR,
    guild_id VARCHAR,
    PRIMARY KEY (domain, guild_id)
);
CREATE TABLE IF NOT EXISTS on_verif (
    guild_id VARCHAR PRIMARY KEY,
    notif_channel VARCHAR,
    role VARCHAR
);
CREATE TABLE IF NOT EXISTS verified_users (
    user_id VARCHAR,
    email VARCHAR,
    PRIMARY KEY (user_id, email)
);
CREATE TABLE IF NOT EXISTS verif_code (
    user_id VARCHAR PRIMARY KEY,
    code VARCHAR,
    email_address VARCHAR
);
