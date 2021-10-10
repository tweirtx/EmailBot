import * as discord from 'discord.js';
import { Client } from 'ts-postgres';
import * as email from "nodemailer";
const config = require("./config.json");

async function sendVerifEmail(addr, randomCode) {
    var transporter = email.createTransport(config.email_info);

    var mailOptions = {
        from : 'from_test@gmail.com',
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
        });
        await discordClient.login(config.token);
    } finally {
        await postgres.end();
    }
}

main();
