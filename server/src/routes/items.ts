// src/routes/items.ts
import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";

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
            email: true,
            username: true,
          },
        },
      },
    });


    res.status(200).json({
      items: items.map((item) => ({
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


export default router;


