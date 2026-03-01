"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, X } from "lucide-react";
import { DISTRICTS } from "@/lib/utils";

export interface FilterValues {
  search: string;
  district: string;
  tenure: string;
  status: string;
  minPrice: string;
  maxPrice: string;
  minPsf: string;
  maxPsf: string;
  bedrooms: string;
  topYear: string;
}

interface FiltersProps {
  filters: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
  developers: string[];
}

const TENURES = ["Freehold", "99-year", "999-year"];
const STATUSES = ["upcoming", "launched", "sold_out", "completed"];
const BEDROOM_OPTIONS = ["1", "2", "3", "4", "5+"];

export function Filters({ filters, onFilterChange, developers }: FiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof FilterValues, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: "",
      district: "",
      tenure: "",
      status: "",
      minPrice: "",
      maxPrice: "",
      minPsf: "",
      maxPsf: "",
      bedrooms: "",
      topYear: "",
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
            placeholder="Search by name or developer..."
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
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
          >
            <option value="">All Status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
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
                  <option value="5000000">$5M</option>
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
                  <option value="10000000">$10M</option>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Min PSF
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 1500"
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
                  placeholder="e.g. 2500"
                  value={filters.maxPsf}
                  onChange={(e) => updateFilter("maxPsf", e.target.value)}
                />
              </div>
            </div>
            {/* TOP Year */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  TOP Year
                </label>
                <Select
                  value={filters.topYear}
                  onChange={(e) => updateFilter("topYear", e.target.value)}
                >
                  <option value="">Any Year</option>
                  {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                    <option key={y} value={y.toString()}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
