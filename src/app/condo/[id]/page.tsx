import { db, type Condo } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShortlistButton } from "@/components/ShortlistButton";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Ruler,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { getStatusLabel, DISTRICTS, formatPrice } from "@/lib/utils";

async function getCondo(id: string): Promise<Condo | null> {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM condos WHERE id = ?",
      args: [parseInt(id)],
    });
    return (result.rows[0] as unknown as Condo) || null;
  } catch (error) {
    console.error("Failed to fetch condo:", error);
    return null;
  }
}

export default async function CondoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const condo = await getCondo(id);

  if (!condo) {
    notFound();
  }

  const statusColors: Record<string, "info" | "success" | "secondary" | "default"> = {
    upcoming: "info",
    launched: "success",
    sold_out: "secondary",
    completed: "default",
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to all condos
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{condo.name}</h1>
                {condo.developer && (
                  <p className="text-lg text-muted-foreground">
                    by {condo.developer}
                  </p>
                )}
              </div>
              <Badge
                variant={statusColors[condo.status || "upcoming"]}
                className="text-sm px-3 py-1"
              >
                {getStatusLabel(condo.status)}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {condo.tenure && <Badge variant="outline">{condo.tenure}</Badge>}
              {condo.bedrooms && (
                <Badge variant="outline">
                  {JSON.parse(condo.bedrooms).join(", ")} BR
                </Badge>
              )}
              {condo.district && (
                <Badge variant="outline">District {condo.district}</Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {condo.description && (
            <Card>
              <CardHeader>
                <CardTitle>About This Development</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{condo.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Key Details */}
          <Card>
            <CardHeader>
              <CardTitle>Key Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">
                    {condo.district
                      ? DISTRICTS[condo.district]
                      : condo.address || "TBA"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Units</p>
                  <p className="font-medium">{condo.total_units || "TBA"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Expected TOP</p>
                  <p className="font-medium">{condo.expected_top || "TBA"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Launch Date</p>
                  <p className="font-medium">{condo.launch_date || "TBA"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Ruler className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Size Range</p>
                  <p className="font-medium">
                    {condo.min_sqft && condo.max_sqft
                      ? `${condo.min_sqft} - ${condo.max_sqft} sqft`
                      : "TBA"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amenities */}
          {condo.amenities && (
            <Card>
              <CardHeader>
                <CardTitle>Facilities & Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(JSON.parse(condo.amenities) as string[]).map((amenity) => (
                    <Badge key={amenity} variant="secondary">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Price Range</p>
                <p className="text-2xl font-bold">
                  {condo.min_price && condo.max_price
                    ? `${formatPrice(condo.min_price)} - ${formatPrice(condo.max_price)}`
                    : "TBA"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PSF Range</p>
                <p className="text-lg font-semibold">
                  {condo.min_psf && condo.max_psf
                    ? `$${condo.min_psf.toLocaleString()} - $${condo.max_psf.toLocaleString()} psf`
                    : "TBA"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <ShortlistButton condoId={condo.id} className="w-full" />
              {condo.website_url && (
                <a
                  href={condo.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-full h-9 px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Website
                </a>
              )}
            </CardContent>
          </Card>

          {/* Location Map Placeholder */}
          {condo.latitude && condo.longitude && (
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <a
                    href={`https://www.google.com/maps?q=${condo.latitude},${condo.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View on Google Maps
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
