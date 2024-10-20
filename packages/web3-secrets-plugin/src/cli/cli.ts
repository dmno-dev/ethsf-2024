import { createDmnoPluginCli } from 'dmno/cli-lib';
import { SetupCommand } from './setup.command';
import { AddItemCommand, UpdateItemCommand, UpsertItemCommand } from './upsert.command';
import { DeleteItemCommand } from './delete.command';

const program = createDmnoPluginCli({
  commands: [
    SetupCommand,
    UpsertItemCommand,
    AddItemCommand,
    UpdateItemCommand,
    DeleteItemCommand,
  ],
});

// run the cli
await program.parseAsync();
