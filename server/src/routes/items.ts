// src/routes/items.ts
import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { ItemStatus } from "../generated/prisma/client";

const router = Router();

/**
 * Helper: parse comma-separated tag IDs into number[]
 */
function parseTagIds(tagIdsParam: any): number[] {
  if (!tagIdsParam || typeof tagIdsParam !== "string") return [];
  return tagIdsParam
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

/**
 * Helper: parse bbox=minLat,minLng,maxLat,maxLng
 */
function parseBbox(bboxParam: any) {
  if (!bboxParam || typeof bboxParam !== "string") return null;
  const parts = bboxParam.split(",").map((p) => parseFloat(p.trim()));
  if (parts.length !== 4 || parts.some((v) => Number.isNaN(v))) return null;

  const [minLat, minLng, maxLat, maxLng] = parts;
  return { minLat, minLng, maxLat, maxLng };
}

// GET /items
// query: q, status, tagIds, bbox, page, limit
router.get("/", async (req, res, next) => {
  try {
    const {
      q,
      status,
      tagIds,
      bbox,
      page = "1",
      limit = "50",
    } = req.query as {
      q?: string;
      status?: string;
      tagIds?: string;
      bbox?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(parseInt(page || "1", 10) || 1, 1);
    const take = Math.min(parseInt(limit || "50", 10) || 50, 100);
    const skip = (pageNum - 1) * take;

    const where: any = {
      isDeleted: false,
    };

    // Status filter
    if (status === "LOST" || status === "FOUND") {
      where.status = status as ItemStatus;
    }

    // Text search filter (simple ILIKE on title/description)
    if (q && q.trim() !== "") {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    // Tag filter
    const tagIdsArr = parseTagIds(tagIds);
    if (tagIdsArr.length > 0) {
      where.tags = {
        some: {
          tagId: { in: tagIdsArr },
        },
      };
    }

    // Bbox filter
    const bboxObj = parseBbox(bbox);
    if (bboxObj) {
      where.AND = where.AND || [];
      where.AND.push(
        {
          latitude: {
            gte: bboxObj.minLat,
            lte: bboxObj.maxLat,
          },
        },
        {
          longitude: {
            gte: bboxObj.minLng,
            lte: bboxObj.maxLng,
          },
        }
      );
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          images: {
            orderBy: { position: "asc" },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true, // later you can hide part of it
            },
          },
        },
      }),
      prisma.item.count({ where }),
    ]);

    res.json({
      items: items.map((item) => ({
        ...item,
        tags: item.tags.map((it) => it.tag),
      })),
      pagination: {
        page: pageNum,
        limit: take,
        total,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /items/:id
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.item.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        images: {
          orderBy: { position: "asc" },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({
      ...item,
      tags: item.tags.map((it) => it.tag),
    });
  } catch (err) {
    next(err);
  }
});

// POST /items  (auth required)
// Body: { title, description, status, latitude, longitude, tagIds, imageUrls }
router.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const {
      title,
      description,
      status,
      latitude,
      longitude,
      tagIds,
      imageUrls,
    } = req.body as {
      title?: string;
      description?: string;
      status?: string;
      latitude?: number;
      longitude?: number;
      tagIds?: number[];
      imageUrls?: string[];
    };

    if (
      !title ||
      !description ||
      !status ||
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return res.status(400).json({
        error:
          "title, description, status, latitude and longitude are required",
      });
    }

    if (status !== "LOST" && status !== "FOUND") {
      return res.status(400).json({ error: "status must be LOST or FOUND" });
    }

    const userId = req.user!.userId;

    const tagIdsArr = Array.isArray(tagIds) ? tagIds : [];

    const imagesArr = Array.isArray(imageUrls) ? imageUrls : [];

    const item = await prisma.item.create({
      data: {
        userId,
        title,
        description,
        status: status as ItemStatus,
        latitude,
        longitude,
        tags: {
          create: tagIdsArr.map((tagId) => ({
            tag: {
              connect: { id: tagId },
            },
          })),
        },
        images: {
          create: imagesArr.map((url, index) => ({
            url,
            position: index,
          })),
        },
      },
      include: {
        images: {
          orderBy: { position: "asc" },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    res.status(201).json({
      ...item,
      tags: item.tags.map((it) => it.tag),
    });
  } catch (err) {
    next(err);
  }
});

// PUT /items/:id  (auth + owner)
// For now: allow updating title, description, status, latitude, longitude
router.put("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existing = await prisma.item.findUnique({
      where: { id },
    });

    if (!existing || existing.isDeleted) {
      return res.status(404).json({ error: "Item not found" });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: "Not allowed to edit this item" });
    }

    const {
      title,
      description,
      status,
      latitude,
      longitude,
    } = req.body as {
      title?: string;
      description?: string;
      status?: string;
      latitude?: number;
      longitude?: number;
    };

    const data: any = {};

    if (typeof title === "string") data.title = title;
    if (typeof description === "string") data.description = description;
    if (typeof latitude === "number") data.latitude = latitude;
    if (typeof longitude === "number") data.longitude = longitude;

    if (typeof status === "string") {
      if (status !== "LOST" && status !== "FOUND") {
        return res
          .status(400)
          .json({ error: "status must be LOST or FOUND if provided" });
      }
      data.status = status as ItemStatus;
    }

    const updated = await prisma.item.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /items/:id  (auth + owner, soft delete)
router.delete("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existing = await prisma.item.findUnique({
      where: { id },
    });

    if (!existing || existing.isDeleted) {
      return res.status(404).json({ error: "Item not found" });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: "Not allowed to delete this item" });
    }

    await prisma.item.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
