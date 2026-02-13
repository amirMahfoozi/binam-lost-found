import { prisma } from "../src/db";

async function main() {
  const updates = [
    { tid: 1, tagname: "wallet",  color: "#f59e0b" }, // amber
    { tid: 2, tagname: "phone",   color: "#3b82f6" }, // blue
    { tid: 3, tagname: "keys",    color: "#10b981" }, // green
    { tid: 4, tagname: "bag",     color: "#8b5cf6" }, // purple
    { tid: 5, tagname: "clothes", color: "#ef4444" }, // red
  ];

  for (const t of updates) {
    await prisma.tags.update({
      where: { tid: t.tid },
      data: { color: t.color, tagname: t.tagname },
    });
  }

  console.log("Tag colors updated.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
