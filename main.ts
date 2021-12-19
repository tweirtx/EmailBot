import * as discord from 'discord.js';
import { Client } from 'ts-postgres';
const { SlashCommandBuilder, SlashCommandStringOption, SlashCommandRoleOption, SlashCommandUserOption, SlashCommandSubcommandBuilder, SlashCommandChannelOption } = require('@discordjs/builders');
import * as email from "nodemailer";
import {Routes} from "discord-api-types/v9";
import {Collection, OAuth2Guild, Snowflake} from "discord.js";
const { REST } = require('@discordjs/rest');
let config;
try {
    config = require("./config.json");
}
catch (Exception) {
    console.log("Configuration file not found. Please run npm setup to continue.");
    process.exit(1);
}

let domaincom = new SlashCommandBuilder()
    .setName('domain')
    .setDescription('Manage allowed domains')
domaincom.addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('add')
    .setDescription('Adds an allowed domain')
        .addStringOption(new SlashCommandStringOption()
            .setName("domain")
            .setDescription("Domain to allow")
            .setRequired(true)))
domaincom.addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('remove')
    .setDescription('Remove an allowed domain')
        .addStringOption(new SlashCommandStringOption()
            .setName("domain")
            .setDescription("Domain to remove")
            .setRequired(true)))
domaincom.addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('list')
    .setDescription("List allowed domains for this server"))

let onverif = new SlashCommandBuilder()
    .setName("onverif")
    .setDescription("Configures what happens when a user passes verification")
onverif.addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('role')
    .setDescription("Set a role to be added to verified users")
    .addRoleOption(new SlashCommandRoleOption()
        .setName("role")
        .setDescription("Role to add to verified users")
        .setRequired(true)))
onverif.addSubcommand(new SlashCommandSubcommandBuilder()
    .setName('logchannel')
    .setDescription('Set a channel to log verifications to')
    .addChannelOption(new SlashCommandChannelOption()
        .setName("logchannel")
        .setDescription("Where to send logs")
        .setRequired(true)))

let lookup = new SlashCommandBuilder()
    .setName("lookup")
    .setDescription("Looks up verified identities for a user")
    .addUserOption(new SlashCommandUserOption()
        .setName("user")
        .setDescription("User to look up")
        .setRequired(true))

let verify = new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Verify yourself")
verify.addSubcommand(new SlashCommandSubcommandBuilder()
    .setName("getcode")
    .setDescription("Sends you an email at an allowed domain with a verification code")
    .addStringOption(new SlashCommandStringOption()
        .setName("email")
        .setDescription("Email to send verification code to")
        .setRequired(true)))
verify.addSubcommand(new SlashCommandSubcommandBuilder()
    .setName("complete")
    .setDescription("Complete verification by entering your code")
    .addStringOption(new SlashCommandStringOption()
        .setName("code")
        .setDescription("Verification code")
        .setRequired(true)))

const commands = [domaincom, onverif, lookup, verify].map(command => command.toJSON());

async function sendVerifEmail(addr, randomCode): Promise<boolean> {
    const transporter = email.createTransport(config.email_info);
    const mailOptions = {
        from : config.email_info.auth.user,
        to : addr,
        subject : 'Verification Code',
        text: 'Your verification code is: ' + randomCode
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    }
    catch (e) {
        console.log(e)
        return false;
    }

}

function refreshSlash(clientObject) {

    const rest = new REST({ version: '9' }).setToken(config.token);

    (async () => {
        try {
            console.log('Started refreshing application (/) commands.');
            const guilds: Collection<Snowflake, OAuth2Guild> = await clientObject.guilds.fetch();

            guilds.forEach(async guild => {
                console.log("Updating commands in "+ guild);
                await rest.put(
                    Routes.applicationGuildCommands(clientObject.user.id, guild.id),
                    { body: commands }
                );
                console.log("Updated commands in " + guild);
            })
            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    })();
}

function domain(interaction): string {
    if (interaction.options._subcommand == "add") {
        // TODO put into database
        const interactDomain = interaction.options.getString('domain');
        return "Added " +  interactDomain;
    }
    else if (interaction.options._subcommand == "remove") {
        // TODO put into database
        const interactDomain = interaction.options.getString('domain');
        return "Deleted " +  interactDomain;
    }
    if (interaction.options._subcommand == "list") {
        // TODO search database
        const domains = []
        return "Allowed domains for server: " + domains;
    }
}

function onVerifHandler(interaction): string {
    if (interaction.options._subcommand == "role") {
        // TODO put into database
        const role = interaction.options.getRole('role');
        return "Successfully set verified role to " + role.name;
    }
    else if (interaction.options._subcommand == "logchannel") {
        // TODO put into database
        const channel = interaction.options.getChannel('logchannel');
        return "Successfully set log channel to " + channel.toString();
    }
}

function lookupHandler(interaction): string {
    // TODO search database
    const user = interaction.options.getUser('user');
    const results = ["asdf@asdf.asdf"];
    if (results.length == 0) {
        return "No results found for " + user.toString();
    }
    else {
        return results.toString();
    }
}

async function verifHandler(interaction): Promise<string> {
    if (interaction.options._subcommand == "getcode") {
        // TODO put into database
        const email = interaction.options.getString('email');
        const response = await sendVerifEmail(email, "012345")
        if (response) {
            return "Check your email!"
        }
        else {
            return "There was an error. Please try again later."
        }
    }
    else if (interaction.options._subcommand == "complete") {
        // TODO put into database, compare verification code
        const codeResponse = interaction.options.getString('code');
        return "Successfully verified";
    }
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

            else if (interaction.commandName === 'onverif') {
                await interaction.reply(onVerifHandler(interaction));
            }

            else if (interaction.commandName === 'lookup') {
                await interaction.reply(lookupHandler(interaction));
            }

            else if (interaction.commandName === 'verify') {
                await interaction.reply(await verifHandler(interaction));
            }

            else {
                await interaction.reply("Command not implemented!");
            }
        });

        await discordClient.login(config.token);
    } finally {
        await postgres.end();
    }
}

main();
