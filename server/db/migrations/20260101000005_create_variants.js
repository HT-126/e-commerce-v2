export async function up(knex) {
  await knex.schema.createTable('variants', (table) => {
    table.increments('id');
    table
      .integer('product_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table.string('sku', 40).notNullable().unique();
    table.string('color_name', 60).notNullable();
    table.string('size', 20).notNullable();
    table.smallint('position').unsigned().notNullable().defaultTo(0);
    table.integer('stock').unsigned().notNullable().defaultTo(0);
    table.timestamps(true, true);

    table.unique(['product_id', 'color_name', 'size']);
  });
  // Second safety net: the conditional update in the order code is the first.
  await knex.raw('ALTER TABLE variants ADD CONSTRAINT variants_stock_check CHECK (stock >= 0)');
}

export async function down(knex) {
  await knex.schema.dropTable('variants');
}
