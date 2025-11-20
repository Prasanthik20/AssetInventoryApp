import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Total assets
    const totalAssets = await prisma.asset_Details.count();

    // Total users
    const totalUsers = await prisma.users.count();

    // Field assets (assuming 'Field Assets' is a category)
    const fieldCategory = await prisma.category.findFirst({
      where: { category: "Field Assets" },
    });

    const fieldAssets = fieldCategory
      ? await prisma.asset_Details.count({
          where: { category_id: fieldCategory.id },
        })
      : 0;

    res.status(200).json({ totalAssets, totalUsers, fieldAssets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
}