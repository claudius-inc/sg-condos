"use client";

import { useState, useMemo } from "react";
import { type Condo } from "@/lib/db";
import { CondoCard } from "@/components/CondoCard";
import { Filters, type FilterValues } from "@/components/Filters";

interface CondoListProps {
  condos: Condo[];
  developers: string[];
}

export function CondoList({ condos, developers }: CondoListProps) {
  const [filters, setFilters] = useState<FilterValues>({
    search: "",
    district: "",
    tenure: "",
    status: "",
    minPsf: "",
    maxPsf: "",
    bedrooms: "",
    topYear: "",
  });

  const filteredCondos = useMemo(() => {
    return condos.filter((condo) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = condo.name.toLowerCase().includes(searchLower);
        const matchesDeveloper = condo.developer?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesDeveloper) return false;
      }

      // District filter
      if (filters.district && condo.district?.toString() !== filters.district) {
        return false;
      }

      // Tenure filter
      if (filters.tenure && condo.tenure !== filters.tenure) {
        return false;
      }

      // Status filter
      if (filters.status && condo.status !== filters.status) {
        return false;
      }

      // Min PSF filter
      if (filters.minPsf && condo.min_psf) {
        if (condo.min_psf < parseInt(filters.minPsf)) return false;
      }

      // Max PSF filter
      if (filters.maxPsf && condo.max_psf) {
        if (condo.max_psf > parseInt(filters.maxPsf)) return false;
      }

      // Bedrooms filter
      if (filters.bedrooms && condo.bedrooms) {
        const bedroomsList = JSON.parse(condo.bedrooms) as number[];
        const filterBedroom = filters.bedrooms === "5+" ? 5 : parseInt(filters.bedrooms);
        if (!bedroomsList.some((b) => b >= filterBedroom)) return false;
      }

      // TOP Year filter
      if (filters.topYear && condo.expected_top) {
        if (!condo.expected_top.includes(filters.topYear)) return false;
      }

      return true;
    });
  }, [condos, filters]);

  return (
    <>
      <Filters
        filters={filters}
        onFilterChange={setFilters}
        developers={developers}
      />

      <div className="mb-4 text-sm text-muted-foreground">
        Showing {filteredCondos.length} of {condos.length} condos
      </div>

      {filteredCondos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No condos match your filters.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your search criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCondos.map((condo) => (
            <CondoCard key={condo.id} condo={condo} />
          ))}
        </div>
      )}
    </>
  );
}
