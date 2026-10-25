export async function up(knex) {
  await knex.schema.createTable('orders', (table) => {
    table.increments('id');
    table.string('order_number', 20).notNullable().unique();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users');
    table.enu('status', ['paid', 'shipped', 'delivered', 'cancelled']).notNullable().defaultTo('paid');
    table.integer('subtotal_cents').unsigned().notNullable();
    table.integer('shipping_cents').unsigned().notNullable();
    table.integer('total_cents').unsigned().notNullable();
    table.string('email', 255).notNullable();
    table.timestamps(true, true);

    table.index(['user_id', 'created_at']);
    table.index(['status']);
  });
}

export async function down(knex) {
  await knex.schema.dropTable('orders');
}
