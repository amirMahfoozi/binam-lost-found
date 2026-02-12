// src/routes/items.ts
import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthRequest, optionalAuth } from "../middleware/auth";

const router = Router();

// POST /items/addItem  (auth required)
// Body: { title, description, type, latitude, longitude, tagIds, imageUrls }
router.post("/addItem", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const {
      title,
      description,
      type,
      latitude,
      longitude,
      tagIds,
      imageUrls,
    } = req.body as {
      title?: string;
      description?: string;
      type?: string;
      latitude?: number;
      longitude?: number;
      tagIds?: number[];
      imageUrls?: string[];
    };

    // basic validation
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "title is required" });
    }
    if (!description || typeof description !== "string") {
      return res.status(400).json({ error: "description is required" });
    }
    if (!type || typeof type !== "string") {
      return res.status(400).json({ error: "type is required" });
    }

    const normalizedType = type.toLowerCase();
    if (normalizedType !== "lost" && normalizedType !== "found") {
      return res.status(400).json({ error: "type must be LOST or FOUND" });
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "latitude and longitude are required" });
    }
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: "Invalid latitude" });
    }
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: "Invalid longitude" });
    }

    const userId = Number(req.user!.userId);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ error: "Invalid auth user" });
    }

    const tagIdsArr = Array.isArray(tagIds) ? tagIds : [];
    if (Array.isArray(tagIds) && tagIds.length === 0) {
      return res.status(400).json({ error: "At least one tag should be selected" });
    }

    const imagesArr = Array.isArray(imageUrls) ? imageUrls : [];

    const created = await prisma.$transaction(async (tx) => {
      // verify tags exist
      const validTags = await tx.tags.findMany({
        where: { tid: { in: tagIdsArr } },
        select: { tid: true },
      });

      if (validTags.length !== tagIdsArr.length) {
        throw new Error("One or more tags do not exist");
      }

      // create item
      const item = await tx.items.create({
        data: {
          uid: userId,
          type: normalizedType,
          title,
          description: description,
          latitude,
          longitude,
        },
      });

      // create images
      if (imagesArr.length > 0) {
        await tx.images.createMany({
          data: imagesArr.map((url) => ({
            iid: item.iid,
            image_url: url,
          })),
        });
      }

      // create item_tags
      await tx.item_tags.createMany({
        data: tagIdsArr.map((tid) => ({
          iid: item.iid,
          tid,
        })),
      });

      // return full item with relations
      return tx.items.findUnique({
        where: { iid: item.iid },
        include: {
          images: { orderBy: { uploaded_at: "asc" } },
          item_tags: { include: { tags: true } },
          users: { select: { uid: true, username: true } },
        },
      });
    });

    res.status(201).json({
      ...created,
      tags: created!.item_tags.map((it) => it.tags),
    });
  } catch (err) {
    next(err);
  }
});


// GET /items/count
// no queries yet
router.get("/count", async (req, res, next) => {
  try {
    const count = await prisma.items.count();

    res.status(200).json({
      count,
    });
  } catch (err) {
    next(err);
  }
});

// GET /items
// query: page, limit, minLat, maxLat, minLong, maxLong
// example query: {{baseURL}}/items?page=1&limit=50&minLat=30&maxLat=60&minLong=60&maxLong=120
router.get("/", async (req, res, next) => {
  try {
    const {
      page,
      limit,
      minLat,
      maxLat,
      minLong,
      maxLong,
    } = req.query as {
      page?: string;
      limit?: string;
      minLat?: string;
      maxLat?: string;
      minLong?: string;
      maxLong?: string;
    };

    // page and item calculation
    const usePagination = page !== undefined || limit !== undefined;

    const pageNum = usePagination
      ? Math.max(parseInt(page || "1", 10) || 1, 1)
      : 1;

    const take = usePagination
      ? Math.min(parseInt(limit || "50", 10) || 50, 100)
      : undefined;

    const skip = usePagination && take !== undefined
      ? (pageNum - 1) * take
      : undefined;

    const where: any = {};

    // Latitude conditions
    if (minLat !== undefined || maxLat !== undefined) {
      where.latitude = {};

      if (minLat !== undefined) {
        where.latitude.gte = Number(minLat);
      }

      if (maxLat !== undefined) {
        where.latitude.lte = Number(maxLat);
      }
    }

    // Longitude conditions
    if (minLong !== undefined || maxLong !== undefined) {
      where.longitude = {};

      if (minLong !== undefined) {
        where.longitude.gte = Number(minLong);
      }

      if (maxLong !== undefined) {
        where.longitude.lte = Number(maxLong);
      }
    }

    const items = await prisma.items.findMany({
      where, 
      orderBy: { add_date: "desc" },
      ...(skip !== undefined && { skip }),
      ...(take !== undefined && { take }),
      select: {
        iid: true,
        title: true,
        description: true,
        type: true,
        add_date: true,

        images: {
          orderBy: { uploaded_at: "asc" },
          take: 1,
          select: {
            image_url: true,
          },
        },

        item_tags: {
          select: {
            tid: true,
          },
        },
      },
    });


    res.status(200).json({
      items: items.map((item) => ({
        id: item.iid,
        title: item.title,
        description: item.description,
        type: item.type,
        createdAt: item.add_date,
        imageUrls: item.images[0]?.image_url ?? null,
        tagIds: item.item_tags.map(s => s.tid),
      })),
      pagination: usePagination
        ? { page: pageNum, limit: take }
        : null,
    });

  } catch (err) {
    next(err);
  }
});

// GET /items/:id (optional auth to check access)
// params: id
router.get("/:id", optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const item = await prisma.items.findUnique({
      where: {
        iid: id,
      },
      include: {
        images: {
          orderBy: { uploaded_at: "asc" },
        },
        item_tags: {
          include: {
            tags: true,
          },
        },
        users: {
          select: {
            uid: true,
            username: true,
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const permissions = {
      canEdit: req.user?.userId === item.uid,
      canDelete: req.user?.userId === item.uid,
    };

    res.json({
      ...item,
      tags: item.item_tags.map((it) => it.tags),
      permissions
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /items/:id  (auth + owner)
// Allow updating title, description, status, latitude, longitude, tagIds, addImageUrls, removeImageIds
router.patch("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const userId = req.user!.userId;

    const existing = await prisma.items.findUnique({
      where: { iid: id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Item not found" });
    }

    if (existing.uid !== Number(userId)) {
      return res.status(403).json({ error: "Not allowed to edit this item" });
    }

    const {
      title,
      description,
      type,
      latitude,
      longitude,
      tagIds,
      addImageUrls,
      removeImageIds,
    } = req.body as {
      title?: string;
      description?: string;
      type?: string;
      latitude?: number;
      longitude?: number;
      tagIds?: number[];
      addImageUrls?: string[];
      removeImageIds?: number[];
    };

    // Check validity of fields
    const itemData: any = {};

    if (typeof title === "string"){
      if (!title || title === "") {
        return res.status(400).json({ error: "missing title" });
      }
      itemData.title = title;
    }

    if (typeof description === "string"){
      if (!description || description === "") {
        return res.status(400).json({ error: "missing description" });
      }
      itemData.description = description;
    }

    if (typeof latitude === "number") {
      if (latitude < -90 || latitude > 90) {
        return res.status(400).json({ error: "Invalid latitude" });
      }
      itemData.latitude = latitude;
    }

    if (typeof longitude === "number") {
      if (longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: "Invalid longitude" });
      }
      itemData.longitude = longitude;
    }

    if (typeof type === "string") {
      const normalized = type.toLowerCase();
      if (normalized !== "lost" && normalized !== "found") {
        return res.status(400).json({ error: "type must be LOST or FOUND" });
      }
      itemData.type = normalized;
    }

    if (tagIds!.length === 0) {
      throw new Error("At least one tag should be selected");
    }

    // Edit item in database
    await prisma.$transaction(async (tx) => {
      // Add item
      if (Object.keys(itemData).length > 0) {
        await tx.items.update({
          where: { iid: id },
          data: itemData,
        });
      }

      if (Array.isArray(tagIds)) {
        // Ensure tags exist
        const validTags = await tx.tags.findMany({
          where: { tid: { in: tagIds } },
          select: { tid: true },
        });

        if (validTags.length !== tagIds.length) {
          throw new Error("One or more tags do not exist");
        }

        // Delete old tags
        await tx.item_tags.deleteMany({
          where: { iid: id },
        });

        // Add new Tags
        if (tagIds.length > 0) {
          await tx.item_tags.createMany({
            data: tagIds.map((tid) => ({
              iid: id,
              tid,
            })),
          });
        }
      }

      // Add new image urls
      if (Array.isArray(addImageUrls) && addImageUrls.length > 0) {
        await tx.images.createMany({
          data: addImageUrls.map((url) => ({
            iid: id,
            image_url: url,
          })),
        });
      }

      // Delete remove image ids
      if (Array.isArray(removeImageIds) && removeImageIds.length > 0) {
        await tx.images.deleteMany({
          where: {
            imid: { in: removeImageIds },
            iid: id,
          },
        });
      }
    });

    // Send updated info back
    const updated = await prisma.items.findUnique({
      where: { iid: id },
      include: {
        images: {
          orderBy: { uploaded_at: "asc" },
        },
        item_tags: {
          include: { tags: true },
        },
        users: {
          select: { uid: true, username: true },
        },
      },
    });

    res.json({
      ...updated,
      tags: updated!.item_tags.map((it) => it.tags),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /items/:id  (auth + owner, hard delete)
// params: id
router.delete("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const userId = req.user!.userId;

    const existing = await prisma.items.findUnique({
      where: { iid: id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Item not found" });
    }

    if (existing.uid !== userId) {
      return res.status(403).json({ error: "Not allowed to delete this item" });
    }

    // Hard delete item cascades to images, comments, item_tags
    await prisma.items.delete({
      where: { iid: id },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
