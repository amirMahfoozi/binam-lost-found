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

    if (
      !title ||
      !description ||
      !type ||
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return res.status(400).json({
        error:
          "title, description, status, latitude and longitude are required",
      });
    }

    if (type !== "LOST" && type !== "FOUND") {
      return res.status(400).json({ error: "status must be Lost or Found" });
    }

    const userId = req.user!.userId;

    const tagIdsArr = Array.isArray(tagIds) ? tagIds : [];

    const imagesArr = Array.isArray(imageUrls) ? imageUrls : [];

    const item = await prisma.items.create({
      data: {
        uid: userId,
        type: type.toLowerCase(),
        title: title,
        description: description,
        latitude: latitude,
        longitude: longitude,

        images: {
          create: imagesArr.map((url) => ({
            image_url: url,
          })),
        },

        item_tags: {
          create: tagIdsArr.map((tagId) => ({
            tags: {
              connect: { tid: tagId },
            },
          })),
        },
      },
      include: {
        images: true,
        item_tags: {
          include: {
            tags: true,
          },
        },
      },
    });


    res.status(201).json({
      ...item,
      tags: item.item_tags.map((it) => it.tags),
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
// query: page, limit
router.get("/", async (req, res, next) => {
  try {
    const {
      page,
      limit,
    } = req.query as {
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(parseInt(page || "1", 10) || 1, 1);
    const take = Math.min(parseInt(limit || "50", 10) || 50, 100);
    const skip = (pageNum - 1) * take;

    const items = await prisma.items.findMany({
      skip: skip,
      take: take,
      orderBy: { add_date: "desc" },
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

        users: {
          select: {
            uid: true,
            username: true,
          },
        },
      },
    });


    res.status(200).json({
      items: items.map((item) => ({
        iid: item.iid,
        title: item.title,
        description: item.description,
        type: item.type,
        add_date: item.add_date,
        image: item.images[0]?.image_url ?? null,
        user: item.users,
      })),
      pagination: {
        page: pageNum,
        limit: take,
      },
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

    if (existing.uid !== userId) {
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
