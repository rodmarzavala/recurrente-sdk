#!/usr/bin/env node


import { initCommand } from "./commands/init.js";
import { listenCommand } from "./commands/listen.js";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    printHelp();
    process.exit(1);
  }

  const command = args[0];

  switch (command) {
    case "init":
      await initCommand();
      break;
    case "listen":
      await listenCommand(args.slice(1));
      break;
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
Recurrente SDK CLI

Usage: recurrente <command> [options]

Commands:
  init      Interactive configuration wizard to scaffold Recurrente in your app
  listen    Local webhook forwarder (Stripe CLI style)

Options:
  -h, --help  Show this help message

Examples:
  npx recurrente init
  npx recurrente listen --forward-to http://localhost:3000/api/webhooks
`);
}

main().catch((err) => {
  console.error("CLI Error:", err.message);
  process.exit(1);
});
