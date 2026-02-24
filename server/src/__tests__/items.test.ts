import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import express from 'express';

/**
 * Mock auth middleware:
 * - requireAuth: needs header x-user-id
 * - optionalAuth: reads header x-user-id if present
 */
jest.unstable_mockModule('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const id = req.header('x-user-id');
    if (!id) return res.status(401).json({ error: 'Unauthorized' });
    req.user = { userId: id };
    next();
  },
  optionalAuth: (req: any, _res: any, next: any) => {
    const id = req.header('x-user-id');
    if (id) req.user = { userId: id };
    next();
  },
}));

/**
 * In-memory Prisma mock for items.ts routes.
 * Implements ONLY what items.ts touches.
 */
jest.unstable_mockModule('../db', () => {
  const tags = [
    { tid: 1, tagname: 'Wallet', color: '#111111' },
    { tid: 2, tagname: 'Phone', color: '#222222' },
    { tid: 3, tagname: 'Keys', color: '#333333' },
  ];

  const users = [
    { uid: 1, username: 'u1', email: 'u1@example.com', password: 'x' },
    { uid: 2, username: 'u2', email: 'u2@example.com', password: 'x' },
  ];

  const items: any[] = [];
  const images: any[] = []; // { imid, iid, image_url, uploaded_at }
  const itemTags: any[] = []; // { iid, tid }

  let iidSeq = 1;
  let imidSeq = 1;

  function pickFirstImage(iid: number) {
    const imgs = images
      .filter((x) => x.iid === iid)
      .sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
    return imgs[0] ?? null;
  }

  function getItemTagIds(iid: number) {
    return itemTags.filter((x) => x.iid === iid).map((x) => x.tid);
  }

  function includeForFindUnique(i: any, include: any) {
    const out: any = { ...i };

    if (include?.images) {
      out.images = images
        .filter((x) => x.iid === i.iid)
        .sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
    }

    if (include?.item_tags?.include?.tags) {
      out.item_tags = itemTags
        .filter((x) => x.iid === i.iid)
        .map((x) => ({
          tid: x.tid,
          tags: tags.find((t) => t.tid === x.tid),
        }));
    }

    if (include?.users?.select) {
      const u = users.find((u) => u.uid === i.uid) ?? null;
      out.users = u ? { uid: u.uid, username: u.username } : null;
    }

    return out;
  }

  function applyWhere(list: any[], where: any) {
    let out = [...list];

    // lat/lng gte/lte
    if (where?.latitude) {
      if (where.latitude.gte !== undefined) out = out.filter((x) => x.latitude >= where.latitude.gte);
      if (where.latitude.lte !== undefined) out = out.filter((x) => x.latitude <= where.latitude.lte);
    }
    if (where?.longitude) {
      if (where.longitude.gte !== undefined) out = out.filter((x) => x.longitude >= where.longitude.gte);
      if (where.longitude.lte !== undefined) out = out.filter((x) => x.longitude <= where.longitude.lte);
    }

    // type
    if (where?.type) out = out.filter((x) => x.type === where.type);

    // AND blocks (used for search + tagMode=all)
    if (Array.isArray(where?.AND)) {
      for (const clause of where.AND) {
        // searchText clause: { OR: [ { title: { contains } }, { description: { contains } } ] }
        if (Array.isArray(clause?.OR)) {
          const needleTitle = clause.OR?.[0]?.title?.contains?.toLowerCase?.() ?? null;
          const needleDesc = clause.OR?.[1]?.description?.contains?.toLowerCase?.() ?? null;

          out = out.filter((x) => {
            const t = (x.title ?? '').toLowerCase();
            const d = (x.description ?? '').toLowerCase();
            return (needleTitle ? t.includes(needleTitle) : false) || (needleDesc ? d.includes(needleDesc) : false);
          });
        }

        // tagMode=all clauses: { item_tags: { some: { tid } } }
        if (clause?.item_tags?.some?.tid) {
          const tid = clause.item_tags.some.tid;
          out = out.filter((x) => getItemTagIds(x.iid).includes(tid));
        }
      }
    }

    // tagMode=any clause: where.item_tags = { some: { tid: { in: [] } } }
    if (where?.item_tags?.some?.tid?.in) {
      const wanted: number[] = where.item_tags.some.tid.in;
      out = out.filter((x) => getItemTagIds(x.iid).some((tid) => wanted.includes(tid)));
    }

    return out;
  }

  const prisma = {
    $transaction: async (fn: any) => fn(prisma),

    tags: {
      findMany: async ({ where, select }: any) => {
        const tids: number[] = where?.tid?.in ?? [];
        const found = tags.filter((t) => tids.includes(t.tid));
        if (!select) return found;
        // only tid selected in items.ts checks
        return found.map((t) => ({ tid: t.tid }));
      },
    },

    items: {
      create: async ({ data }: any) => {
        const row = {
          iid: iidSeq++,
          uid: data.uid,
          type: data.type,
          title: data.title,
          description: data.description,
          latitude: data.latitude,
          longitude: data.longitude,
          add_date: new Date(),
        };
        items.push(row);
        return row;
      },

      findUnique: async ({ where, include }: any) => {
        const iid = where?.iid;
        const found = items.find((x) => x.iid === iid) ?? null;
        if (!found) return null;
        if (!include) return found;
        return includeForFindUnique(found, include);
      },

      findMany: async ({ where, orderBy, skip, take, select }: any) => {
        let out = applyWhere(items, where ?? {});
        // orderBy add_date desc
        if (orderBy?.add_date === 'desc') {
          out.sort((a, b) => new Date(b.add_date).getTime() - new Date(a.add_date).getTime());
        }

        if (typeof skip === 'number') out = out.slice(skip);
        if (typeof take === 'number') out = out.slice(0, take);

        // map-items uses select with nested images + item_tags.tags
        if (select) {
          return out.map((i) => ({
            iid: i.iid,
            title: i.title,
            description: i.description,
            type: i.type,
            latitude: i.latitude,
            longitude: i.longitude,
            add_date: i.add_date,
            images: select.images
              ? (pickFirstImage(i.iid) ? [{ image_url: pickFirstImage(i.iid)!.image_url }] : [])
              : undefined,
            item_tags: select.item_tags
              ? itemTags
                  .filter((x) => x.iid === i.iid)
                  .map((x) => ({
                    tags: tags.find((t) => t.tid === x.tid),
                  }))
              : undefined,
          }));
        }

        return out;
      },

      update: async ({ where, data }: any) => {
        const iid = where?.iid;
        const idx = items.findIndex((x) => x.iid === iid);
        if (idx < 0) throw new Error('Item not found');
        items[idx] = { ...items[idx], ...data };
        return items[idx];
      },

      delete: async ({ where }: any) => {
        const iid = where?.iid;
        const idx = items.findIndex((x) => x.iid === iid);
        if (idx < 0) throw new Error('Item not found');
        items.splice(idx, 1);
        for (let i = images.length - 1; i >= 0; i--) if (images[i].iid === iid) images.splice(i, 1);
        for (let i = itemTags.length - 1; i >= 0; i--) if (itemTags[i].iid === iid) itemTags.splice(i, 1);
        return { success: true };
      },

      count: async () => items.length,
    },

    images: {
      createMany: async ({ data }: any) => {
        for (const row of data) {
          images.push({
            imid: imidSeq++,
            iid: row.iid,
            image_url: row.image_url,
            uploaded_at: new Date(),
          });
        }
        return { count: data.length };
      },
      deleteMany: async ({ where }: any) => {
        const iid = where?.iid;
        const ids: number[] = where?.imid?.in ?? [];
        for (let i = images.length - 1; i >= 0; i--) {
          if (images[i].iid === iid && ids.includes(images[i].imid)) images.splice(i, 1);
        }
        return { count: ids.length };
      },
    },

    item_tags: {
      createMany: async ({ data }: any) => {
        for (const row of data) itemTags.push({ iid: row.iid, tid: row.tid });
        return { count: data.length };
      },
      deleteMany: async ({ where }: any) => {
        const iid = where?.iid;
        for (let i = itemTags.length - 1; i >= 0; i--) if (itemTags[i].iid === iid) itemTags.splice(i, 1);
        return { count: 1 };
      },
    },
  };

  return { prisma };
});

// IMPORTANT: import AFTER mocks
const { default: itemsRouter } = await import('../routes/items');
const { default: request } = await import('supertest');

function makeTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/items', itemsRouter);

  // minimal error handler like your app.ts
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(500).json({ error: err?.message ?? 'Internal error' });
  });

  return app;
}

describe('Items routes', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('POST /items/addItem -> 401 when not authenticated', async () => {
    const app = makeTestApp();
    const res = await request(app).post('/items/addItem').send({
      title: 'x',
      description: 'y',
      type: 'lost',
      latitude: 1,
      longitude: 2,
      tagIds: [1],
      imageUrls: [],
    });

    expect(res.status).toBe(401);
  });

  it('POST /items/addItem -> 400 for invalid type/coords', async () => {
    const app = makeTestApp();

    const res1 = await request(app)
      .post('/items/addItem')
      .set('x-user-id', '1')
      .send({
        title: 'x',
        description: 'y',
        type: 'INVALID',
        latitude: 1,
        longitude: 2,
        tagIds: [1],
      });
    expect(res1.status).toBe(400);
    expect(res1.body.error).toMatch(/type must be/i);

    const res2 = await request(app)
      .post('/items/addItem')
      .set('x-user-id', '1')
      .send({
        title: 'x',
        description: 'y',
        type: 'lost',
        latitude: 999, // invalid
        longitude: 2,
        tagIds: [1],
      });
    expect(res2.status).toBe(400);
    expect(res2.body.error).toMatch(/invalid latitude/i);
  });

  it('POST /items/addItem -> 201 creates item + returns tags', async () => {
    const app = makeTestApp();

    const res = await request(app)
      .post('/items/addItem')
      .set('x-user-id', '1')
      .send({
        title: 'Lost phone',
        description: 'black phone',
        type: 'LOST',
        latitude: 35.7,
        longitude: 51.35,
        tagIds: [2, 3],
        imageUrls: ['http://example.com/a.jpg'],
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Lost phone');
    expect(res.body.type).toBe('lost'); // normalized
    expect(Array.isArray(res.body.tags)).toBe(true);
    expect(res.body.tags.length).toBe(2);
  });

  it('GET /items/map-items -> returns mapped shape (imageUrl + tags)', async () => {
    const app = makeTestApp();

    // create one item via route (also tests transaction paths)
    await request(app)
      .post('/items/addItem')
      .set('x-user-id', '1')
      .send({
        title: 'Keys',
        description: 'car keys',
        type: 'found',
        latitude: 35.701,
        longitude: 51.352,
        tagIds: [3],
        imageUrls: ['http://example.com/k.jpg'],
      });

    const res = await request(app).get('/items/map-items');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items[0]).toHaveProperty('id');
    expect(res.body.items[0]).toHaveProperty('imageUrl'); // note: singular in map-items
    expect(Array.isArray(res.body.items[0].tags)).toBe(true);
    expect(res.body.items[0].tags[0]).toHaveProperty('tid');
    expect(res.body.items[0].tags[0]).toHaveProperty('tagname');
  });

  it('GET /items -> supports search + tag filters AND /items/:id permissions', async () => {
    const app = makeTestApp();

    // item A: tag 1, type lost, title contains "wallet"
    const a = await request(app)
      .post('/items/addItem')
      .set('x-user-id', '1')
      .send({
        title: 'My wallet',
        description: 'brown',
        type: 'lost',
        latitude: 35.702,
        longitude: 51.353,
        tagIds: [1],
        imageUrls: [],
      });

    // item B: tag 2, type found, title contains "phone"
    await request(app)
      .post('/items/addItem')
      .set('x-user-id', '2')
      .send({
        title: 'Found phone',
        description: 'iphone',
        type: 'found',
        latitude: 35.704,
        longitude: 51.354,
        tagIds: [2],
        imageUrls: [],
      });

    // filter: searchText=wallet + tagIds=1 (any/all both should match single tag)
    const listRes = await request(app).get('/items').query({
      page: '1',
      limit: '50',
      searchText: 'wallet',
      tagIds: '1',
      tagMode: 'any',
    });

    expect(listRes.status).toBe(200);
    expect(listRes.body.items.length).toBe(1);
    expect(listRes.body.items[0].title.toLowerCase()).toContain('wallet');

    // permissions: optionalAuth checks header x-user-id
    const showResOwner = await request(app)
      .get(`/items/${a.body.iid ?? a.body.id ?? a.body?.iid}`)
      .set('x-user-id', '1');

    // NOTE: addItem returns full item shape from prisma.findUnique include
    // so iid will exist in body if your prisma include returns it. If not, fallback to `a.body.id`.
    expect(showResOwner.status).toBe(200);
    expect(showResOwner.body.permissions.canEdit).toBe(true);
    expect(showResOwner.body.permissions.canDelete).toBe(true);

    const showResAnon = await request(app).get(`/items/${a.body.iid ?? a.body.id ?? a.body?.iid}`);
    expect(showResAnon.status).toBe(200);
    expect(showResAnon.body.permissions.canEdit).toBe(false);
    expect(showResAnon.body.permissions.canDelete).toBe(false);
  });
});