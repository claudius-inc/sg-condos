import { NextRequest, NextResponse } from "next/server";
import { db, type Condo } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ids = searchParams.get("ids");

  try {
    if (ids) {
      const idList = ids.split(",").map((id) => parseInt(id.trim())).filter((id) => !isNaN(id));
      
      if (idList.length === 0) {
        return NextResponse.json({ condos: [] });
      }

      const placeholders = idList.map(() => "?").join(",");
      const result = await db.execute({
        sql: `SELECT * FROM condos WHERE id IN (${placeholders})`,
        args: idList,
      });

      return NextResponse.json({ condos: result.rows as unknown as Condo[] });
    }

    // Return all condos
    const result = await db.execute("SELECT * FROM condos ORDER BY launch_date DESC, name ASC");
    return NextResponse.json({ condos: result.rows as unknown as Condo[] });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to fetch condos" }, { status: 500 });
  }
}
