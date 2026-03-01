"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, Calendar, DollarSign } from "lucide-react";
import { type Condo } from "@/lib/db";
import { formatPSF, getStatusLabel, DISTRICTS } from "@/lib/utils";

interface CondoCardProps {
  condo: Condo;
  onShortlist?: (id: number) => void;
  isShortlisted?: boolean;
}

export function CondoCard({ condo, onShortlist, isShortlisted }: CondoCardProps) {
  const statusColors: Record<string, string> = {
    upcoming: "info",
    launched: "success",
    sold_out: "secondary",
    completed: "default",
  };

  return (
    <Link href={`/condo/${condo.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-lg line-clamp-2">{condo.name}</CardTitle>
            <Badge variant={statusColors[condo.status || "upcoming"] as "info" | "success" | "secondary" | "default"}>
              {getStatusLabel(condo.status)}
            </Badge>
          </div>
          {condo.developer && (
            <p className="text-sm text-muted-foreground">{condo.developer}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="line-clamp-1">
              {condo.district ? DISTRICTS[condo.district] || `District ${condo.district}` : condo.address || "TBA"}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>
              {condo.min_psf && condo.max_psf
                ? `$${condo.min_psf.toLocaleString()} - $${condo.max_psf.toLocaleString()} psf`
                : formatPSF(condo.min_psf)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{condo.total_units ? `${condo.total_units} units` : "TBA"}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>TOP: {condo.expected_top || "TBA"}</span>
          </div>

          {condo.tenure && (
            <div className="pt-2 border-t">
              <Badge variant="outline" className="text-xs">
                {condo.tenure}
              </Badge>
              {condo.bedrooms && (
                <Badge variant="outline" className="text-xs ml-2">
                  {JSON.parse(condo.bedrooms).join(", ")} BR
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
