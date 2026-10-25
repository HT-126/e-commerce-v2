export async function up(knex) {
  await knex.schema.createTable('product_images', (table) => {
    table.increments('id');
    table
      .integer('product_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table.string('url', 500).notNullable();
    table.string('alt', 255).notNullable().defaultTo('');
    table.smallint('width').unsigned().nullable();
    table.smallint('height').unsigned().nullable();
    table.tinyint('position').unsigned().notNullable().defaultTo(0);
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  await knex.schema.dropTable('product_images');
}
