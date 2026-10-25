export async function up(knex) {
  await knex.schema.createTable('order_items', (table) => {
    table.increments('id');
    table.integer('order_id').unsigned().notNullable().references('id').inTable('orders');
    table
      .integer('variant_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('variants')
      .onDelete('SET NULL');
    table.integer('product_id').unsigned().notNullable().references('id').inTable('products');
    table.string('product_slug', 160).notNullable();
    table.string('title', 200).notNullable();
    table.string('color_name', 60).notNullable();
    table.string('size', 20).notNullable();
    table.string('image_url', 500).notNullable();
    table.integer('unit_price_cents').unsigned().notNullable();
    table.tinyint('quantity').unsigned().notNullable();
    table.integer('line_total_cents').unsigned().notNullable();
    table.timestamps(true, true);

    table.index(['order_id']);
    table.index(['product_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTable('order_items');
}
