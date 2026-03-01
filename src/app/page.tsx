import { db, type Condo } from "@/lib/db";
import { CondoList } from "./CondoList";

async function getCondos(): Promise<Condo[]> {
  try {
    const result = await db.execute("SELECT * FROM condos ORDER BY launch_date DESC, name ASC");
    return result.rows as unknown as Condo[];
  } catch (error) {
    console.error("Failed to fetch condos:", error);
    return [];
  }
}

async function getDevelopers(): Promise<string[]> {
  try {
    const result = await db.execute("SELECT DISTINCT developer FROM condos WHERE developer IS NOT NULL ORDER BY developer");
    return result.rows.map((row) => row.developer as string);
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [condos, developers] = await Promise.all([getCondos(), getDevelopers()]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Singapore New Launch Condos</h1>
        <p className="text-muted-foreground">
          Track upcoming and recently launched condominiums across Singapore
        </p>
      </div>

      <CondoList condos={condos} developers={developers} />
    </div>
  );
}
