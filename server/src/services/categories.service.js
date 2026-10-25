import { db } from '../db/knex.js';

// Menu order.
export const listCategories = () => db('categories').select('id', 'name', 'slug').orderBy('position');
