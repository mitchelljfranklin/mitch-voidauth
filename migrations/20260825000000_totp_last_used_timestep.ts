import type { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.table('totp', (table) => {
    table.integer('lastUsedTimestep').nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.table('totp', (table) => {
    table.dropColumn('lastUsedTimestep')
  })
}
