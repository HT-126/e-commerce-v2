import * as categoriesService from '../services/categories.service.js';

export async function list(req, res) {
  res.json({ data: await categoriesService.listCategories() });
}
