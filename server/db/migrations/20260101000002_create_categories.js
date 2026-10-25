export async function up(knex) {
  await knex.schema.createTable('categories', (table) => {
    table.increments('id');
    table.string('name', 60).notNullable();
    table.string('slug', 60).notNullable().unique();
    table.tinyint('position').unsigned().notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTable('categories');
}
