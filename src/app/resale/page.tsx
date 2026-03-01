import { db, type Condo } from "@/lib/db";
import { ResaleList } from "./ResaleList";

async function getResaleCondos(): Promise<Condo[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM condos WHERE status = 'completed' OR status = 'resale' ORDER BY name ASC"
    );
    return result.rows as unknown as Condo[];
  } catch (error) {
    console.error("Failed to fetch resale condos:", error);
    return [];
  }
}

async function getDevelopers(): Promise<string[]> {
  try {
    const result = await db.execute(
      "SELECT DISTINCT developer FROM condos WHERE (status = 'completed' OR status = 'resale') AND developer IS NOT NULL ORDER BY developer"
    );
    return result.rows.map((row) => row.developer as string);
  } catch {
    return [];
  }
}

export default async function ResalePage() {
  const [condos, developers] = await Promise.all([getResaleCondos(), getDevelopers()]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Resale Condos</h1>
        <p className="text-muted-foreground">
          Completed developments available on the resale market
        </p>
      </div>

      <ResaleList condos={condos} developers={developers} />
    </div>
  );
}
