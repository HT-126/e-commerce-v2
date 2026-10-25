import { colorGroupFor } from '../../src/utils/color-groups.js';

const INDEX = 'variants_product_color_group_size_idx';

// Base color for the shop filter. Existing rows are filled from `color_name`, so no reset is needed.
// The backfill uses the app's mapping function, so it reads the rules as they are when the migration runs.
// MySQL cannot roll back the ALTER: if the backfill fails, run `migrate:rollback` before running it again.
export async function up(knex) {
  await knex.schema.alterTable('variants', (table) => {
    table.string('color_group', 20).notNullable().defaultTo('other');
    table.index(['product_id', 'color_group', 'size'], INDEX);
  });

  const names = await knex('variants').distinct('color_name').pluck('color_name');
  const namesByGroup = new Map();
  for (const name of names) {
    const group = colorGroupFor(name);
    if (group === 'other') continue; // the column default already says "other"
    namesByGroup.set(group, [...(namesByGroup.get(group) ?? []), name]);
  }
  for (const [group, groupNames] of namesByGroup) {
    await knex('variants').whereIn('color_name', groupNames).update({ color_group: group });
  }
}

export async function down(knex) {
  await knex.schema.alterTable('variants', (table) => {
    table.dropIndex(['product_id', 'color_group', 'size'], INDEX);
    table.dropColumn('color_group');
  });
}
