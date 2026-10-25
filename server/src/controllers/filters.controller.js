import * as filtersService from '../services/filters.service.js';

export async function get(req, res) {
  res.json({ data: await filtersService.getFilters() });
}
