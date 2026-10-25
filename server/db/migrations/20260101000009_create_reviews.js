export async function up(knex) {
  await knex.schema.createTable('reviews', (table) => {
    table.increments('id');
    table
      .integer('product_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.tinyint('rating').unsigned().notNullable();
    table.text('comment').nullable();
    table.timestamps(true, true);

    table.unique(['product_id', 'user_id']);
    table.index(['product_id', 'created_at']);
  });
  await knex.raw('ALTER TABLE reviews ADD CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 5)');
}

export async function down(knex) {
  await knex.schema.dropTable('reviews');
}
