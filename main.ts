import * as discord from 'discord.js';
import { Client } from 'ts-postgres';
import * as email from "nodemailer";
import {Routes} from "discord-api-types/v9";
import {Collection, OAuth2Guild, Snowflake} from "discord.js";
let config;
try {
    config = require("./config.json");
}
catch (Exception) {
    console.log("Configuration file not found. Please run npm setup to continue.");
    process.exit(1);
}
const commands = [{
    name: 'domain',
    description: 'Configures domain'
}];

async function sendVerifEmail(addr, randomCode) {
    var transporter = email.createTransport(config.email_info);

    var mailOptions = {
        from : config.email_info.auth.user,
        to : addr,
        subject : 'Verification Code',
        text: 'Your verification code is: ' + randomCode
    };

    transporter.sendMail( mailOptions, (error, info) => {
        if (error) {
            return console.log(`error: ${error}`);
        }
        console.log(`Message Sent ${info.response}`);
    });
}

function refreshSlash(clientObject) {
    const { REST } = require('@discordjs/rest');
    const { Routes } = require('discord-api-types/v9');

    const rest = new REST({ version: '9' }).setToken(config.token);

    (async () => {
        try {
            console.log('Started refreshing application (/) commands.');
            const guilds: Collection<Snowflake, OAuth2Guild> = await clientObject.guilds.fetch();
            console.log(guilds.keys());

            for (let guild in guilds.keys()) {
                console.log("Updating commands in "+ guild);
                await rest.put(
                    Routes.applicationGuildCommands(clientObject.user.id, guild),
                    { body: commands }
                );
                console.log("Updated commands in " + guild);
            }
            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    })();
}

function domain(interaction): string {
    return "test";
}

async function main() {
    const postgres = new Client(config.postgres_info);
    await postgres.connect();
    const discordClient = new discord.Client({intents: [discord.Intents.FLAGS.GUILDS]});
    try {
        // Querying the client returns a query result promise
        // which is also an asynchronous result iterator.
        const resultIterator = postgres.query(
            `SELECT 'Hello ' || $1 || '!' AS message`,
            ['world']
        );

        for await (const row of resultIterator) {
            // 'Hello world!'
            console.log(row.get('message'));
        }

        discordClient.once('ready', () => {
            console.log('Ready!');
            refreshSlash(discordClient);
        });

        discordClient.on('interactionCreate', async interaction => {
            if (!interaction.isCommand()) return;

            if (interaction.commandName === 'domain') {
                await interaction.reply(domain(interaction));
            }
        });

        await discordClient.login(config.token);
    } finally {
        await postgres.end();
    }
}

main();
