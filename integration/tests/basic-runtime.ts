// tslint:disable-next-line: match-default-export-name no-implicit-dependencies
// tslint:disable-next-line: match-default-export-name
import ApolloClient, { gql } from 'apollo-boost';
import test, { ExecutionContext } from 'ava';
import { unlinkSync } from 'fs';
import { TestxServer, SQLiteDatabase } from 'graphql-testx';

import fetch from "node-fetch";
import { migrateDB } from '../../packages/graphql-migrations';

// tslint:disable-next-line: no-require-imports
import * as Knex from 'knex';
import { schema as basicSchema } from '../schemas/basic.graphql';
import { schema as relationsSchema } from '../schemas/relations-schema.graphql';

const dbOptions = {
  client: "sqlite3",
  connection: { filename: "./test.sqlite" }
};

let database;

test.beforeEach(() => {
  try {
    unlinkSync("./test.sqlite")
  } catch {
    // Ignore
  }

  const knex = Knex(dbOptions);
  database = new SQLiteDatabase(knex);
})

test.serial('Graphback runtime end to end', async (t: ExecutionContext) => {
  const server = await createServer(basicSchema);
  await graphbackRuntimeWorkflow(server, t);
});

test.serial('Graphback runtime relationships - generic OneToMany', async (t: ExecutionContext) => {
  const server = await createServer(relationsSchema);
  await graphbackRuntimeWorkflow(server, t);
});

async function graphbackRuntimeWorkflow(server: TestxServer, t: ExecutionContext<unknown>) {
  // Test migrations
  const migration = await migrateDB(dbOptions, basicSchema);
  const dbSchema = await server.getDatabaseSchema();
  // Complex migration is validated by reviewing snapshots 
  t.snapshot(migration);
  t.snapshot(dbSchema);
  // Test runtime
  const queries = await server.getQueries();

  const mutations = await server.getMutations();
  const uri = await server.httpUrl();
  const client = new ApolloClient({ uri, fetch });
  await createItem(client, mutations, t);
  await updateItem(client, t, queries, mutations);
}

async function createServer(schema: string) {
  const server = new TestxServer({
    schema,
    database: database
  });
  await server.start();

  return server;
}

async function findItems(client: ApolloClient<unknown>, queries, t: ExecutionContext<unknown>) {
  const findResult = await client.query({
    query: gql(queries.findAllItems)
  });
  const itemV1 = findResult.data.findAllItems.find(i => i.title === "TestA");
  t.assert(itemV1);

  return itemV1;
}

async function updateItem(client: ApolloClient<unknown>, t: ExecutionContext<unknown>, queries, mutations) {
  const itemV1 = await findItems(client, queries, t);
  const updateResult = await client.mutate({
    mutation: gql(mutations.updateItem),
    variables: { id: itemV1.id, title: "TestB" }
  });
  const itemV2 = updateResult.data.updateItem;
  t.deepEqual(itemV2.id, itemV1.id);
  t.deepEqual(itemV2.title, "TestB");
}

async function createItem(client: ApolloClient<unknown>, mutations, t: ExecutionContext<unknown>) {
  console.log(mutations)
  const result = await client.mutate({
    mutation: gql(mutations.createItem),
    variables: { title: "TestA" }
  });
  const item = result.data.createItem;
  t.assert(item.id);
  t.deepEqual(item.title, "TestA");
}
