# EmailBot
A Discord bot that allows you to verify an individual's status at a chosen university or other organization via email.

Currently very WIP but it's a project for me to start messing around with TypeScript a bit

# Setup Guide (manual)
1. Install PostgreSQL, git, and node.js with npm. This procedure varies by OS, and is out of scope for this document.
2. Run `git clone https://github.com/tweirtx/EmailBot` followed by `cd EmailBot`.
3. Create a database and a user for EmailBot within postgres. If you are unfamiliar with this process, open a Postgres shell
and run the following commands for an example config:
```sql
CREATE DATABASE emailbot;
CREATE USER emailbot PASSWORD 'somethingclever';
```
4. Run `npm setup` in the EmailBot directory. You will be interactively asked for configuration details,
then some statements to configure the database will be run.

Explanation of configuration elements: 
```
token: This is your Discord bot token.

postgres_info host: This is where your postgres server is. 
On your local machine, this should be set to 127.0.0.1

postgres_info port: This is the port your postgres server runs on.
Unless you know what you're doing, leave it at the default 5432.

postgres_info user: username for your postgres user. 
This should be emailbot unless you configured differently.

postgres_info database: Database name bot should connect to.
This should be emailbot unless you configured differently.

postgres_info password: password for your postgres user.
This might be somethingclever or you might have come up with something actually clever.

email_info host: This is the SMTP host. If using gmail, use smtp.gmail.com
email_info auth user: Sending email address.
email_info auth password: Email password.
```
