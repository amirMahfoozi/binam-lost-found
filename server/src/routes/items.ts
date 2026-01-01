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

export default router;
