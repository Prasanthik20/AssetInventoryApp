import type { NextApiRequest, NextApiResponse } from "next";
import query from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
 if (req.method === "GET") {
  const { supervisorId } = req.query;

  if (!supervisorId) {
    return res.status(400).json({ message: "supervisorId required" });
  }

  const sql = `
    SELECT 
      aa.id AS "assignmentId",
      ad.id AS "assetId",
      ad.name AS "assetName",
      u."fullName" AS "operatorName",
      aa.location,
      aa."projectName",
      aa.assigned_date,
      aa.expected_return_date
    FROM asset_assignments aa
    JOIN asset_details ad ON ad.id = aa.assetid
    JOIN users u ON u."employeeId" = aa.operator_employeeid
    WHERE aa.supervisor_employeeid = $1
      AND aa.expected_return_date < CURRENT_DATE
    ORDER BY aa.expected_return_date ASC;
  `;

  try {
    const result = await query(sql, [Number(supervisorId)]);
    return res.status(200).json({ overdue: result.rows });
  } catch (err) {
    console.error("Supervisor Overdue API Error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
  }

  return res.status(405).json({ message: `Method ${req.method} not allowed` });

}