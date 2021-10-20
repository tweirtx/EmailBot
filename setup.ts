import { Client } from 'ts-postgres';
let config = require("./config.example.json");

async function main() {
    // Create config programmatically
    for (let key in config) {
        console.log(key); //Make this iterate all keys and ask for config options
    }
    // execute SQL statements
    const postgres = new Client(config.postgres_info);
    await postgres.connect();
    //await postgres.query(open("file://")) //Open SQL schema file and execute on postgres host
}

main();
