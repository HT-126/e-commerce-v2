export async function up(knex) {
  await knex.schema.createTable('cart_items', (table) => {
    table.increments('id');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table
      .integer('variant_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('variants')
      .onDelete('CASCADE');
    table.tinyint('quantity').unsigned().notNullable();
    table.timestamps(true, true);

    table.unique(['user_id', 'variant_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTable('cart_items');
}
