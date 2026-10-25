export async function up(knex) {
  await knex.schema.createTable('products', (table) => {
    table.increments('id');
    table.string('source_id', 20).nullable().unique();
    table.string('slug', 160).notNullable().unique();
    table.string('title', 200).notNullable();
    table.text('description').nullable();
    table.json('highlights').nullable();
    table.text('styling_note').nullable();
    table.json('size_chart').nullable();
    table.integer('category_id').unsigned().notNullable().references('id').inTable('categories');
    table.integer('price_cents').unsigned().notNullable();
    table.decimal('seed_rating_avg', 2, 1).nullable();
    table.integer('seed_review_count').unsigned().notNullable().defaultTo(0);
    table.decimal('rating_avg', 2, 1).nullable();
    table.integer('review_count').unsigned().notNullable().defaultTo(0);
    table.string('material', 120).nullable();
    table.string('care', 255).nullable();
    table.string('fit', 40).nullable();
    table.string('length', 40).nullable();
    table.string('closure', 60).nullable();
    table.string('season', 40).nullable();
    table.string('pattern', 60).nullable();
    table.text('sizing_notes').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);

    table.index(['category_id', 'is_active']);
    table.index(['price_cents']);
    table.index(['created_at']);
    table.index(['rating_avg']);
  });
}

export async function down(knex) {
  await knex.schema.dropTable('products');
}
