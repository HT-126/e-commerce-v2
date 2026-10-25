import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/db/knex.js';
import { cleanTables, createCategory, createProduct, createUser, login } from '../helpers/db.js';

const app = createApp();
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

let admin;
beforeEach(async () => {
  await cleanTables();
  admin = await login(app, await createUser({ role: 'admin' }));
});
afterAll(() => db.destroy());

const validProduct = (categoryId, overrides = {}) => ({
  title: 'Linen Midi Dress',
  slug: 'linen-midi-dress',
  categoryId,
  priceCents: 5999,
  isActive: true,
  images: [{ url: 'https://cdn.example/a.webp', alt: 'Front' }],
  ...overrides,
});

const productRow = (id) => db('products').where({ id }).first();
const variantRow = (id) => db('variants').where({ id }).first();
const imagesOf = (id) => db('product_images').where({ product_id: id }).orderBy('position');
const shopPage = (slug) => request(app).get(`/api/products/${slug}`);

describe('POST /api/admin/products', () => {
  it('creates a product with its photos, and the shop can show it', async () => {
    const category = await createCategory({ name: 'Dresses', slug: 'dresses' });

    const res = await admin.post('/api/admin/products').send(
      validProduct(category.id, {
        description: 'Light and airy.',
        highlights: ['Breathable', 'Relaxed fit'],
        material: '100% linen',
        images: [
          { url: 'https://cdn.example/a.webp', alt: 'Front' },
          { url: 'https://cdn.example/b.webp' },
        ],
      }),
    );

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      slug: 'linen-midi-dress',
      title: 'Linen Midi Dress',
      categoryId: category.id,
      category: { name: 'Dresses', slug: 'dresses' },
      priceCents: 5999,
      isActive: true,
      description: 'Light and airy.',
      highlights: ['Breathable', 'Relaxed fit'],
      material: '100% linen',
      care: null,
      ratingAvg: null,
      reviewCount: 0,
      variants: [],
      images: [
        { url: 'https://cdn.example/a.webp', alt: 'Front' },
        { url: 'https://cdn.example/b.webp', alt: '' },
      ],
    });
    const page = await shopPage('linen-midi-dress');
    expect(page.status).toBe(200);
    expect(page.body.data.title).toBe('Linen Midi Dress');
  });

  it('puts the photos in the order given, the first one is the main photo', async () => {
    const category = await createCategory();

    const res = await admin.post('/api/admin/products').send(
      validProduct(category.id, {
        images: [{ url: 'https://cdn.example/1.webp' }, { url: 'https://cdn.example/2.webp' }],
      }),
    );

    const rows = await imagesOf(res.body.data.id);
    expect(rows.map((row) => [row.url, row.position])).toEqual([
      ['https://cdn.example/1.webp', 0],
      ['https://cdn.example/2.webp', 1],
    ]);
  });

  it('can create a hidden product, which the shop does not show', async () => {
    const category = await createCategory();

    const res = await admin.post('/api/admin/products').send(validProduct(category.id, { isActive: false }));

    expect(res.status).toBe(201);
    expect((await shopPage('linen-midi-dress')).status).toBe(404);
  });

  it('answers 409 SLUG_TAKEN for a slug that exists, and makes no product', async () => {
    const category = await createCategory();
    await createProduct({ slug: 'linen-midi-dress', category });

    const res = await admin.post('/api/admin/products').send(validProduct(category.id));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLUG_TAKEN');
    expect(await db('products').count({ total: '*' }).first()).toMatchObject({ total: 1 });
  });

  it('answers 400 for an unknown category, naming the field', async () => {
    const res = await admin.post('/api/admin/products').send(validProduct(999999));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toEqual(['categoryId']);
    expect(await db('products')).toEqual([]);
  });

  const invalid = [
    ['no title', { title: undefined }],
    ['a blank title', { title: '   ' }],
    ['a title over 200 characters', { title: 'a'.repeat(201) }],
    ['a slug with capitals', { slug: 'Bad-Slug' }],
    ['a slug with spaces', { slug: 'bad slug' }],
    ['a slug with a double dash', { slug: 'bad--slug' }],
    ['no slug', { slug: undefined }],
    ['a price of 0', { priceCents: 0 }],
    ['a fractional price', { priceCents: 10.5 }],
    ['a price sent as text', { priceCents: '5999' }],
    ['no price', { priceCents: undefined }],
    ['no isActive', { isActive: undefined }],
    ['no photos', { images: [] }],
    ['11 photos', { images: Array.from({ length: 11 }, (_, i) => ({ url: `https://cdn.example/${i}.webp` })) }],
    ['a photo that is not a web address', { images: [{ url: 'not a url' }] }],
    ['a javascript: photo address', { images: [{ url: 'javascript:alert(1)' }] }],
    ['an ftp photo address', { images: [{ url: 'ftp://cdn.example/a.webp' }] }],
    ['21 highlights', { highlights: Array.from({ length: 21 }, (_, i) => `Line ${i}`) }],
    ['a material over 120 characters', { material: 'a'.repeat(121) }],
  ];
  it.each(invalid)('rejects %s with 400', async (_name, change) => {
    const category = await createCategory();

    const res = await admin.post('/api/admin/products').send(validProduct(category.id, change));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await db('products')).toEqual([]);
  });

  it('trims text and saves an empty optional field as nothing', async () => {
    const category = await createCategory();

    const res = await admin.post('/api/admin/products').send(
      validProduct(category.id, { title: '  Padded  ', material: '   ', care: null, highlights: [] }),
    );

    expect(res.body.data).toMatchObject({ title: 'Padded', material: null, care: null, highlights: [] });
  });
});

describe('PATCH /api/admin/products/:id', () => {
  it('changes only the fields that are sent', async () => {
    const product = await createProduct({ title: 'Old', priceCents: 3000, material: 'Cotton' });

    const res = await admin.patch(`/api/admin/products/${product.id}`).send({ title: 'New' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ title: 'New', priceCents: 3000, material: 'Cotton' });
    expect(await productRow(product.id)).toMatchObject({ title: 'New', price_cents: 3000, material: 'Cotton' });
  });

  it('clears an optional field with null or an empty text', async () => {
    const product = await createProduct({ material: 'Cotton', care: 'Wash cold' });

    const res = await admin.patch(`/api/admin/products/${product.id}`).send({ material: null, care: '' });

    expect(res.body.data).toMatchObject({ material: null, care: null });
  });

  it('replaces the whole photo list, and a photo that stays keeps its width and height', async () => {
    const product = await createProduct({
      images: [
        { url: 'https://cdn.example/keep.webp', alt: 'Keep' },
        { url: 'https://cdn.example/drop.webp', alt: 'Drop' },
      ],
    });

    const res = await admin.patch(`/api/admin/products/${product.id}`).send({
      images: [{ url: 'https://cdn.example/new.webp', alt: 'New' }, { url: 'https://cdn.example/keep.webp', alt: 'Kept' }],
    });

    expect(res.status).toBe(200);
    const rows = await imagesOf(product.id);
    expect(rows.map((row) => [row.url, row.alt, row.position])).toEqual([
      ['https://cdn.example/new.webp', 'New', 0],
      ['https://cdn.example/keep.webp', 'Kept', 1],
    ]);
    expect(rows[1]).toMatchObject({ width: 800, height: 1000 });
    expect(rows[0]).toMatchObject({ width: null, height: null });
  });

  it('keeps the photos when none are sent', async () => {
    const product = await createProduct();

    await admin.patch(`/api/admin/products/${product.id}`).send({ title: 'Renamed' });

    expect(await imagesOf(product.id)).toHaveLength(1);
  });

  it('hides a product from the shop, and shows it again', async () => {
    const product = await createProduct({ slug: 'hide-me' });
    expect((await shopPage('hide-me')).status).toBe(200);

    const hide = await admin.patch(`/api/admin/products/${product.id}`).send({ isActive: false });

    expect(hide.body.data.isActive).toBe(false);
    expect((await shopPage('hide-me')).status).toBe(404);
    const list = await request(app).get('/api/products');
    expect(list.body.data.items.map((item) => item.slug)).not.toContain('hide-me');
    // The admin still sees it.
    const adminList = await admin.get('/api/admin/products');
    expect(adminList.body.data.items.map((item) => item.slug)).toContain('hide-me');

    await admin.patch(`/api/admin/products/${product.id}`).send({ isActive: true });
    expect((await shopPage('hide-me')).status).toBe(200);
  });

  it('changes the slug, and answers 409 SLUG_TAKEN for one that exists', async () => {
    const product = await createProduct({ slug: 'mine' });
    await createProduct({ slug: 'taken' });

    const taken = await admin.patch(`/api/admin/products/${product.id}`).send({ slug: 'taken' });
    const free = await admin.patch(`/api/admin/products/${product.id}`).send({ slug: 'renamed' });

    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe('SLUG_TAKEN');
    expect(free.status).toBe(200);
    expect((await productRow(product.id)).slug).toBe('renamed');
  });

  it('accepts the product\'s own slug again', async () => {
    const product = await createProduct({ slug: 'mine' });

    const res = await admin.patch(`/api/admin/products/${product.id}`).send({ slug: 'mine', title: 'Same slug' });

    expect(res.status).toBe(200);
  });

  it('changes the category, and answers 400 for an unknown one', async () => {
    const product = await createProduct();
    const other = await createCategory({ name: 'Tops', slug: 'tops' });

    const ok = await admin.patch(`/api/admin/products/${product.id}`).send({ categoryId: other.id });
    const bad = await admin.patch(`/api/admin/products/${product.id}`).send({ categoryId: 999999 });

    expect(ok.body.data.category).toEqual({ name: 'Tops', slug: 'tops' });
    expect(bad.status).toBe(400);
  });

  it('does not change a product that fails validation', async () => {
    const product = await createProduct({ title: 'Safe', priceCents: 3000 });

    const res = await admin.patch(`/api/admin/products/${product.id}`).send({ title: 'Changed', priceCents: 0 });

    expect(res.status).toBe(400);
    expect(await productRow(product.id)).toMatchObject({ title: 'Safe', price_cents: 3000 });
  });

  it('rolls everything back when the photos are invalid, so the other fields are not saved either', async () => {
    const product = await createProduct({ title: 'Safe' });

    const res = await admin.patch(`/api/admin/products/${product.id}`).send({ title: 'Changed', images: [] });

    expect(res.status).toBe(400);
    expect((await productRow(product.id)).title).toBe('Safe');
    expect(await imagesOf(product.id)).toHaveLength(1);
  });

  it('answers 400 for a body with nothing in it', async () => {
    const product = await createProduct();

    const res = await admin.patch(`/api/admin/products/${product.id}`).send({});

    expect(res.status).toBe(400);
  });

  it('answers 404 for an unknown product and 400 for a bad id', async () => {
    expect((await admin.patch('/api/admin/products/999999').send({ title: 'x' })).status).toBe(404);
    expect((await admin.patch('/api/admin/products/abc').send({ title: 'x' })).status).toBe(400);
  });

  it('does not change the rating, the review count or the dataset values', async () => {
    const product = await createProduct({ ratingAvg: 4.5, reviewCount: 8, seed_rating_avg: 4.5, seed_review_count: 8 });

    await admin.patch(`/api/admin/products/${product.id}`).send({
      title: 'x', ratingAvg: 1, reviewCount: 0, seed_rating_avg: 1, rating_avg: 1,
    });

    expect(await productRow(product.id)).toMatchObject({ rating_avg: '4.5', review_count: 8, seed_review_count: 8 });
  });
});

describe('GET /api/admin/products/:id', () => {
  it('returns the product with its photos and its variants with their stock', async () => {
    const product = await createProduct({
      title: 'Full',
      variants: [
        { color: 'Black', size: 'S', stock: 3 },
        { color: 'Black', size: 'M', stock: 0 },
      ],
    });

    const res = await admin.get(`/api/admin/products/${product.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: product.id, title: 'Full', isActive: true });
    expect(res.body.data.variants).toEqual([
      { id: product.variants[0].id, sku: expect.any(String), color: 'Black', size: 'S', position: 0, stock: 3 },
      { id: product.variants[1].id, sku: expect.any(String), color: 'Black', size: 'M', position: 1, stock: 0 },
    ]);
    expect(res.body.data.images).toEqual([{ url: 'https://cdn.example/main.webp', alt: 'Main photo' }]);
  });

  it('returns a hidden product too', async () => {
    const product = await createProduct({ isActive: false });

    const res = await admin.get(`/api/admin/products/${product.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it('answers 404 for an unknown product and 400 for a bad id', async () => {
    expect((await admin.get('/api/admin/products/999999')).status).toBe(404);
    expect((await admin.get('/api/admin/products/abc')).status).toBe(400);
  });
});

describe('GET /api/admin/products', () => {
  async function fourProducts() {
    const dresses = await createCategory({ name: 'Dresses', slug: 'dresses' });
    const tops = await createCategory({ name: 'Tops', slug: 'tops' });
    await createProduct({ slug: 'a', title: 'Blue Dress', category: dresses, priceCents: 5000, createdAt: daysAgo(4) });
    await createProduct({ slug: 'b', title: 'Red Dress', category: dresses, priceCents: 3000, createdAt: daysAgo(3) });
    await createProduct({ slug: 'c', title: 'Green Top', category: tops, priceCents: 4000, createdAt: daysAgo(2) });
    await createProduct({ slug: 'd', title: 'Hidden Top', category: tops, priceCents: 2000, createdAt: daysAgo(1), isActive: false });
  }
  const slugs = (res) => res.body.data.items.map((item) => item.slug);

  it('lists every product, hidden ones too, newest first', async () => {
    await fourProducts();

    const res = await admin.get('/api/admin/products');

    expect(res.status).toBe(200);
    expect(slugs(res)).toEqual(['d', 'c', 'b', 'a']);
    expect(res.body.data).toMatchObject({ page: 1, limit: 20, total: 4 });
  });

  it('shows what the table needs: category, price, active, variants, total stock and the main photo', async () => {
    const product = await createProduct({
      slug: 'one',
      title: 'One',
      priceCents: 4500,
      variants: [
        { color: 'Black', size: 'S', stock: 3 },
        { color: 'Black', size: 'M', stock: 4 },
      ],
    });

    const res = await admin.get('/api/admin/products');

    expect(res.body.data.items[0]).toEqual({
      id: product.id,
      slug: 'one',
      title: 'One',
      category: { name: expect.any(String), slug: expect.any(String) },
      priceCents: 4500,
      isActive: true,
      variantCount: 2,
      totalStock: 7,
      imageUrl: 'https://cdn.example/main.webp',
    });
  });

  it('shows 0 variants and 0 stock for a product with none', async () => {
    await createProduct({ variants: [] });

    const res = await admin.get('/api/admin/products');

    expect(res.body.data.items[0]).toMatchObject({ variantCount: 0, totalStock: 0 });
  });

  it.each([
    ['title', ['Blue Dress', 'Green Top', 'Hidden Top', 'Red Dress']],
    ['price_asc', ['Hidden Top', 'Red Dress', 'Green Top', 'Blue Dress']],
    ['price_desc', ['Blue Dress', 'Green Top', 'Red Dress', 'Hidden Top']],
  ])('sorts by %s', async (sort, titles) => {
    await fourProducts();

    const res = await admin.get(`/api/admin/products?sort=${sort}`);

    expect(res.body.data.items.map((item) => item.title)).toEqual(titles);
  });

  it('filters by category, by active and by a word in the title', async () => {
    await fourProducts();

    expect(slugs(await admin.get('/api/admin/products?category=dresses'))).toEqual(['b', 'a']);
    expect(slugs(await admin.get('/api/admin/products?active=false'))).toEqual(['d']);
    expect(slugs(await admin.get('/api/admin/products?active=true'))).toEqual(['c', 'b', 'a']);
    expect(slugs(await admin.get('/api/admin/products?q=top'))).toEqual(['d', 'c']);
    expect(slugs(await admin.get('/api/admin/products?q=%25'))).toEqual([]);
  });

  it('pages the list', async () => {
    await fourProducts();

    const res = await admin.get('/api/admin/products?limit=3&page=2');

    expect(slugs(res)).toEqual(['a']);
    expect(res.body.data).toMatchObject({ page: 2, limit: 3, total: 4 });
  });

  it.each(['limit=101', 'limit=0', 'page=0', 'active=maybe', 'sort=random'])('rejects %s with 400', async (query) => {
    const res = await admin.get(`/api/admin/products?${query}`);

    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/products/:id/variants', () => {
  it('adds a variant that the shop shows, in stock, after the others', async () => {
    const product = await createProduct({ variants: [{ color: 'Black', size: 'S', stock: 2 }] });

    const res = await admin
      .post(`/api/admin/products/${product.id}/variants`)
      .send({ sku: 'NEW-1', color: 'Navy Blue', size: 'M', stock: 6 });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ id: expect.any(Number), sku: 'NEW-1', color: 'Navy Blue', size: 'M', position: 1, stock: 6 });
    const page = await shopPage(product.slug);
    expect(page.body.data.variants).toContainEqual({ id: res.body.data.id, color: 'Navy Blue', size: 'M', inStock: true });
    // The shop filter works from the color group.
    expect((await variantRow(res.body.data.id)).color_group).toBe('blue');
  });

  it('puts the first variant of a product at position 0', async () => {
    const product = await createProduct({ variants: [] });

    const res = await admin
      .post(`/api/admin/products/${product.id}/variants`)
      .send({ sku: 'FIRST', color: 'Black', size: 'S', stock: 1 });

    expect(res.body.data.position).toBe(0);
  });

  it('allows a stock of 0 (shown as sold out)', async () => {
    const product = await createProduct({ variants: [] });

    const res = await admin
      .post(`/api/admin/products/${product.id}/variants`)
      .send({ sku: 'ZERO', color: 'Black', size: 'S', stock: 0 });

    expect(res.status).toBe(201);
    const page = await shopPage(product.slug);
    expect(page.body.data.variants[0].inStock).toBe(false);
  });

  it('answers 409 SKU_TAKEN for a SKU that exists, even on another product', async () => {
    const product = await createProduct({ variants: [] });
    const other = await createProduct({ variants: [{ color: 'Black', size: 'S', stock: 1 }] });
    const taken = (await variantRow(other.variants[0].id)).sku;

    const res = await admin
      .post(`/api/admin/products/${product.id}/variants`)
      .send({ sku: taken, color: 'Red', size: 'M', stock: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SKU_TAKEN');
  });

  it('answers 409 VARIANT_TAKEN for a second variant with the same color and size', async () => {
    const product = await createProduct({ variants: [{ color: 'Black', size: 'M', stock: 1 }] });

    const res = await admin
      .post(`/api/admin/products/${product.id}/variants`)
      .send({ sku: 'DIFFERENT', color: 'Black', size: 'M', stock: 1 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VARIANT_TAKEN');
  });

  it('lets two products have a variant of the same color and size', async () => {
    const first = await createProduct({ variants: [{ color: 'Black', size: 'M', stock: 1 }] });
    const second = await createProduct({ variants: [] });

    const res = await admin
      .post(`/api/admin/products/${second.id}/variants`)
      .send({ sku: 'SECOND-BM', color: 'Black', size: 'M', stock: 1 });

    expect(first.id).not.toBe(second.id);
    expect(res.status).toBe(201);
  });

  it.each([
    ['a negative stock', { stock: -1 }],
    ['a fractional stock', { stock: 1.5 }],
    ['a stock sent as text', { stock: '5' }],
    ['no stock', { stock: undefined }],
    ['a blank SKU', { sku: '  ' }],
    ['a SKU over 40 characters', { sku: 'a'.repeat(41) }],
    ['a blank color', { color: '' }],
    ['a size over 20 characters', { size: 'a'.repeat(21) }],
  ])('rejects %s with 400', async (_name, change) => {
    const product = await createProduct({ variants: [] });

    const res = await admin
      .post(`/api/admin/products/${product.id}/variants`)
      .send({ sku: 'OK-1', color: 'Black', size: 'S', stock: 1, ...change });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await db('variants').where({ product_id: product.id })).toEqual([]);
  });

  it('answers 404 for an unknown product', async () => {
    const res = await admin
      .post('/api/admin/products/999999/variants')
      .send({ sku: 'X', color: 'Black', size: 'S', stock: 1 });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/admin/variants/:id', () => {
  const patch = (variantId, body) => admin.patch(`/api/admin/variants/${variantId}`).send(body);

  it('sets an exact stock number, and the shop shows sold out at 0 and in stock again after', async () => {
    const product = await createProduct({ variants: [{ color: 'Black', size: 'M', stock: 10 }] });
    const id = product.variants[0].id;

    const zero = await patch(id, { stock: 0 });
    expect(zero.status).toBe(200);
    expect(zero.body.data.stock).toBe(0);
    expect((await shopPage(product.slug)).body.data.variants[0].inStock).toBe(false);
    expect((await request(app).get('/api/products')).body.data.items[0].soldOut).toBe(true);

    const five = await patch(id, { stock: 5 });
    expect(five.body.data.stock).toBe(5);
    expect(await variantRow(id)).toMatchObject({ stock: 5 });
    expect((await shopPage(product.slug)).body.data.variants[0].inStock).toBe(true);
  });

  it.each([
    ['below 0', -1],
    ['a fraction', 1.5],
    ['text', '5'],
    ['null', null],
    ['too big', 1_000_001],
  ])('rejects a stock of %s with 400, and leaves the stock', async (_name, stock) => {
    const product = await createProduct({ variants: [{ color: 'Black', size: 'M', stock: 10 }] });
    const id = product.variants[0].id;

    const res = await patch(id, { stock });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect((await variantRow(id)).stock).toBe(10);
  });

  it('changes the color, and so the color group the shop filters by', async () => {
    const product = await createProduct({ variants: [{ color: 'Black', size: 'M', stock: 10 }] });
    const id = product.variants[0].id;

    const res = await patch(id, { color: 'Red' });

    expect(res.status).toBe(200);
    expect(res.body.data.color).toBe('Red');
    expect((await variantRow(id)).color_group).toBe('red');
  });

  it('changes the size', async () => {
    const product = await createProduct({ variants: [{ color: 'Black', size: 'M', stock: 10 }] });

    const res = await patch(product.variants[0].id, { size: 'L' });

    expect(res.body.data.size).toBe('L');
  });

  it('answers 409 VARIANT_TAKEN when the change makes two variants the same', async () => {
    const product = await createProduct({
      variants: [
        { color: 'Black', size: 'S', stock: 1 },
        { color: 'Black', size: 'M', stock: 1 },
      ],
    });

    const res = await patch(product.variants[1].id, { size: 'S' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VARIANT_TAKEN');
    expect((await variantRow(product.variants[1].id)).size).toBe('M');
  });

  it('accepts the variant\'s own color and size again', async () => {
    const product = await createProduct({ variants: [{ color: 'Black', size: 'M', stock: 1 }] });

    const res = await patch(product.variants[0].id, { color: 'Black', size: 'M', stock: 3 });

    expect(res.status).toBe(200);
  });

  it('answers 400 for an empty body, 404 for an unknown variant and 400 for a bad id', async () => {
    const product = await createProduct();

    expect((await patch(product.variants[0].id, {})).status).toBe(400);
    expect((await patch(999999, { stock: 1 })).status).toBe(404);
    expect((await patch('abc', { stock: 1 })).status).toBe(400);
  });

  it('shows stock numbers to the admin, and the shop still never does', async () => {
    const product = await createProduct({ variants: [{ color: 'Black', size: 'M', stock: 7 }] });

    const adminView = await admin.get(`/api/admin/products/${product.id}`);
    const shopView = await shopPage(product.slug);

    expect(adminView.body.data.variants[0].stock).toBe(7);
    expect(JSON.stringify(shopView.body)).not.toContain('"stock"');
  });
});
