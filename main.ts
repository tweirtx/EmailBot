import * as discord from 'discord.js';
import {Collection, OAuth2Guild, Snowflake} from 'discord.js';
import {Client, DataType} from 'ts-postgres';
import * as email from "nodemailer";
import {Routes} from "discord-api-types/v9";
import {randomInt} from "crypto";

const { SlashCommandBuilder, SlashCommandStringOption, SlashCommandRoleOption, SlashCommandUserOption, SlashCommandSubcommandBuilder, SlashCommandChannelOption } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
let config;
let postgres;
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

async function requirePerms(interaction, admin: boolean): Promise<boolean> {
    const perms = interaction.memberPermissions;
    let hasThem;
    if (admin) {
        hasThem = perms.has("ADMINISTRATOR");
        if (!hasThem) {
            interaction.reply("You must be an administrator to run this command!")
        }
    }
    else {
        hasThem = perms.has("MODERATE_MEMBERS");
        if (!hasThem) {
            interaction.reply("The moderate members permission is required to run this command.")
        }
    }
    return hasThem;
}

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

async function domain(interaction): Promise<string> {
    if (interaction.options._subcommand == "add" && await requirePerms(interaction, true)) {
        const interactDomain = interaction.options.getString('domain');
        postgres.query("INSERT INTO allowed_domains (domain, guild_id) VALUES ($1, $2)",
            [interactDomain, interaction.guild.id],
            [DataType.Varchar, DataType.Varchar])
        return "Added " + interactDomain;
    } else if (interaction.options._subcommand == "remove" && await requirePerms(interaction, true)) {
        const interactDomain = interaction.options.getString('domain');
        postgres.query("DELETE FROM allowed_domains WHERE guild_id = $1 AND domain = $2;",
            [interaction.guild.id, interactDomain]);
        return "Removed " + interactDomain + " from allowed domains";
    } else if (interaction.options._subcommand == "list") {
        const resultIterator = postgres.query(
            `SELECT * FROM allowed_domains WHERE guild_id = $1`,
            [interaction.guild.id]
        );
        let domains = [];

        for await (const row of resultIterator) {
            domains.push(row.get('domain'));
        }
        const domainsAsStr = domains.join(", ");
        return "Allowed domains for server: " + domainsAsStr;
    }

}

function onVerifHandler(interaction): string {
    if (interaction.options._subcommand == "role") {
        const role = interaction.options.getRole('role');
        postgres.query("INSERT INTO on_verif (guild_id, role) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET role = EXCLUDED.role",
            [interaction.guild.id, role.id],
            [DataType.Varchar, DataType.Varchar])
        return "Successfully set verified role to " + role.name;
    }
    else if (interaction.options._subcommand == "logchannel") {
        const channel = interaction.options.getChannel('logchannel');
        postgres.query("INSERT INTO on_verif (guild_id, notif_channel) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET notif_channel = EXCLUDED.notif_channel",
            [interaction.guild.id, channel.id],
            [DataType.Varchar, DataType.Varchar])
        return "Successfully set log channel to " + channel.toString();
    }
}

async function lookupHandler(interaction): Promise<string> {
    const user = interaction.options.getUser('user');
    const userLookup = postgres.query(
        `SELECT *
         FROM verified_users
         WHERE user_id = $1`,
        [user.id]
    );
    const domainLookup = postgres.query(
        `SELECT *
         FROM allowed_domains
         WHERE guild_id = $1`,
        [interaction.guild.id]
    );
    let results = [];
    let allowedDomains = [];
    for await (const row of domainLookup) {
        allowedDomains.push(row.get('domain'));
    }
    for await (const row of userLookup) {
        const emailDomain = row.get('email').split('@')[1];
        if (allowedDomains.includes(emailDomain)) {
            results.push(row.get('email'));
        }
    }

    if (results.length == 0) {
        return "No results found for " + user.toString();
    } else {
        return results.toString();
    }
}

function randomizer(): string {
    let output = "";
    let times = 6
    for(let i = 0; i < times; i++){
        output += randomInt(0,9);
    }
    return output;
}

async function runVerif(userID, guildID, address): Promise<boolean> {
    const domainLookup = postgres.query(
        `SELECT *
         FROM allowed_domains
         WHERE guild_id = $1`,
        [guildID]
    );
    const inputDomain = address.split("@")[1];
    let foundMatch = false;
    for await (let domCompare of domainLookup) {
        if (inputDomain == domCompare.get("domain")) {
            foundMatch = true;
            break
        }
    }
    if (foundMatch) {
        // TODO apply roles and send appropriate notification channel message
    }
    return foundMatch;
}

async function verifHandler(interaction): Promise<string> {
    if (interaction.options._subcommand == "getcode") {
        const email = interaction.options.getString('email');
        const random = randomizer();
        const domainLookup = await postgres.query(
            `SELECT domain
         FROM allowed_domains
         WHERE guild_id = $1`,
            [interaction.guild.id]
        );
        const inputDomain = email.split("@")[1];
        let foundMatch = false;
        for await (let domCompare of domainLookup) {
            if (inputDomain == domCompare.get("domain")) {
                foundMatch = true;
                break
            }
        }
        if (!foundMatch) {
            return "This domain is not allowed for the requested server."
        }
        const response = await sendVerifEmail(email, random)
        if (response) {
            postgres.query("INSERT INTO verif_code (user_id, code, email_address) VALUES ($1, $2, $3)",
                [interaction.user.id, random, email],
                [DataType.Varchar, DataType.Varchar, DataType.Varchar])
            return "Check your email!"
        }
        else {
            return "There was an error. Please try again later."
        }
    }
    else if (interaction.options._subcommand == "complete") {
        const codeResponse = interaction.options.getString('code');
        const codeLookup = await postgres.query(
            `SELECT *
         FROM verif_code
         WHERE user_id = $1 AND code = $2`,
            [interaction.user.id, codeResponse]
        );
        let foundCode = false;
        let address;
        for await (let response of codeLookup) {
            foundCode = true;
            address = response.get("email_address")
        }
        if (!foundCode) {
            return "Invalid code entered. Please try again."
        }
        const foundMatch = await runVerif(interaction.user.id, interaction.guild.id, address);
        if (!foundMatch) {
            return "This domain is not allowed for this server!"
        }
        postgres.query("INSERT INTO verified_users (user_id, email) VALUES ($1, $2)",
            [interaction.user.id, address],
            [DataType.Varchar, DataType.Varchar])
        return "Successfully verified";
    }
}

async function main() {
    postgres = new Client(config.postgres_info);
    await postgres.connect();
    const discordClient = new discord.Client({intents: [discord.Intents.FLAGS.GUILDS]});
    try {

        discordClient.once('ready', () => {
            console.log('Ready!');
            //refreshSlash(discordClient);
        });

        discordClient.on('interactionCreate', async interaction => {
            if (!interaction.isCommand()) return;

            if (interaction.commandName === 'domain') {
                const reply = await domain(interaction);
                if (typeof reply == "string") {
                    await interaction.reply(reply);
                }
            }

            else if (interaction.commandName === 'onverif' && await requirePerms(interaction, true)) {
                await interaction.reply(onVerifHandler(interaction));
            }

            else if (interaction.commandName === 'lookup' && await requirePerms(interaction, false)) {
                await interaction.reply({content: await lookupHandler(interaction), ephemeral: true});
            }

            else if (interaction.commandName === 'verify') {
                await interaction.reply({content: await verifHandler(interaction), ephemeral: true});
            }

        });

        await discordClient.login(config.token);
    } finally {
        console.log("Finally");
    }
}

main();
