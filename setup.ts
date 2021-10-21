import { Client } from 'ts-postgres';
const fs = require('fs');

async function main() {
    // Create config file from example
    if (!fs.existsSync("config.json")) {
        fs.cpSync("config.example.json", "config.json");
        console.log("Please fill out your config file and change any defaults you need to!");
        process.exit(0);
    }

    // execute SQL statements
    let config = require("./config.json");

    const postgres = new Client(config.postgres_info);
    await postgres.connect();

    //Open SQL schema file and execute on postgres host

    fs.readFile('schema.sql', 'utf8', (err, data) => {
        if (err) throw err;
        console.log("Applying schema");
        const statements = data.split(";");
        for (let statement in statements) {
            postgres.query(statements[statement]);
        }
        console.log("Database configured!");
    });
}

main();
