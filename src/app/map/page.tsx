import { db, type Condo } from "@/lib/db";
import { MapView } from "@/components/MapView";

async function getCondos(): Promise<Condo[]> {
  try {
    const result = await db.execute(
      "SELECT * FROM condos WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY name"
    );
    return result.rows as unknown as Condo[];
  } catch (error) {
    console.error("Failed to fetch condos:", error);
    return [];
  }
}

export default async function MapPage() {
  const condos = await getCondos();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Map View</h1>
        <p className="text-muted-foreground">
          Explore condos by location. Click markers for details.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span>Upcoming</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500" />
          <span>Now Selling</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gray-500" />
          <span>Sold Out</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-purple-500" />
          <span>Completed</span>
        </div>
      </div>

      <MapView condos={condos} />

      <div className="mt-6 text-sm text-muted-foreground">
        Showing {condos.length} condos with location data
      </div>
    </div>
  );
}
