"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, X } from "lucide-react";
import { DISTRICTS } from "@/lib/utils";

export interface ResaleFilterValues {
  search: string;
  district: string;
  tenure: string;
  minPrice: string;
  maxPrice: string;
  minPsf: string;
  maxPsf: string;
  bedrooms: string;
  minAge: string;
  maxAge: string;
}

interface ResaleFiltersProps {
  filters: ResaleFilterValues;
  onFilterChange: (filters: ResaleFilterValues) => void;
  developers: string[];
}

const TENURES = ["Freehold", "99-year", "999-year"];
const BEDROOM_OPTIONS = ["1", "2", "3", "4", "5+"];
const AGE_OPTIONS = [
  { value: "0", label: "New (0-3 yrs)" },
  { value: "3", label: "3-5 yrs" },
  { value: "5", label: "5-10 yrs" },
  { value: "10", label: "10-20 yrs" },
  { value: "20", label: "20+ yrs" },
];

export function ResaleFilters({ filters, onFilterChange, developers }: ResaleFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof ResaleFilterValues, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: "",
      district: "",
      tenure: "",
      minPrice: "",
      maxPrice: "",
      minPsf: "",
      maxPsf: "",
      bedrooms: "",
      minAge: "",
      maxAge: "",
    });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Less" : "More"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, address, or developer..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Quick filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select
            value={filters.district}
            onChange={(e) => updateFilter("district", e.target.value)}
          >
            <option value="">All Districts</option>
            {Object.entries(DISTRICTS).map(([num, name]) => (
              <option key={num} value={num}>
                {name}
              </option>
            ))}
          </Select>

          <Select
            value={filters.tenure}
            onChange={(e) => updateFilter("tenure", e.target.value)}
          >
            <option value="">All Tenure</option>
            {TENURES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>

          <Select
            value={filters.bedrooms}
            onChange={(e) => updateFilter("bedrooms", e.target.value)}
          >
            <option value="">All Bedrooms</option>
            {BEDROOM_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b} BR
              </option>
            ))}
          </Select>

          <Select
            value={filters.maxAge}
            onChange={(e) => updateFilter("maxAge", e.target.value)}
          >
            <option value="">Any Age</option>
            <option value="3">Under 3 years</option>
            <option value="5">Under 5 years</option>
            <option value="10">Under 10 years</option>
            <option value="20">Under 20 years</option>
          </Select>
        </div>

        {/* Expanded filters */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t">
            {/* Budget filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Min Budget ($)
                </label>
                <Select
                  value={filters.minPrice}
                  onChange={(e) => updateFilter("minPrice", e.target.value)}
                >
                  <option value="">No Min</option>
                  <option value="500000">$500K</option>
                  <option value="800000">$800K</option>
                  <option value="1000000">$1M</option>
                  <option value="1500000">$1.5M</option>
                  <option value="2000000">$2M</option>
                  <option value="3000000">$3M</option>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Max Budget ($)
                </label>
                <Select
                  value={filters.maxPrice}
                  onChange={(e) => updateFilter("maxPrice", e.target.value)}
                >
                  <option value="">No Max</option>
                  <option value="1000000">$1M</option>
                  <option value="1500000">$1.5M</option>
                  <option value="2000000">$2M</option>
                  <option value="3000000">$3M</option>
                  <option value="5000000">$5M</option>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Min PSF
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 1000"
                  value={filters.minPsf}
                  onChange={(e) => updateFilter("minPsf", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Max PSF
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 2000"
                  value={filters.maxPsf}
                  onChange={(e) => updateFilter("maxPsf", e.target.value)}
                />
              </div>
            </div>
            {/* Age range */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Min Age (years)
                </label>
                <Select
                  value={filters.minAge}
                  onChange={(e) => updateFilter("minAge", e.target.value)}
                >
                  <option value="">Any</option>
                  <option value="5">5+ years</option>
                  <option value="10">10+ years</option>
                  <option value="15">15+ years</option>
                  <option value="20">20+ years</option>
                </Select>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
