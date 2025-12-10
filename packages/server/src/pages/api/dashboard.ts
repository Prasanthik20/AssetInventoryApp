import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Total Assets
    const totalAssets = await prisma.asset_Details.count();

    // Total Users
    const totalUsers = await prisma.users.count();

    // Office Assets → Unassigned
    const officeAssets = await prisma.asset_Details.count({
      where: { status: { status: "Unassigned" } },
    });

    // Field Assets → Assigned + Overdue
    const fieldAssets = await prisma.asset_Details.count({
      where: { status: { status: { in: ["Assigned", "Overdue"] } } },
    });

    return res.status(200).json({
      totalAssets,
      totalUsers,
      officeAssets,
      fieldAssets,
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
