import type { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.table('flag', (table) => {
    table.dateTime('updatedAt', { useTz: true }).nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.table('flag', (table) => {
    table.dropColumn('updatedAt')
  })
}
