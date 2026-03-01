"use client";

import { useState, useCallback, useMemo } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { type Condo } from "@/lib/db";
import { formatPSF, getStatusLabel, DISTRICTS } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface MapViewProps {
  condos: Condo[];
}

const SINGAPORE_CENTER = { lat: 1.3521, lng: 103.8198 };

function getMarkerColor(status: string | null): string {
  switch (status) {
    case "upcoming":
      return "#3B82F6"; // blue
    case "launched":
      return "#22C55E"; // green
    case "sold_out":
      return "#6B7280"; // gray
    case "completed":
      return "#8B5CF6"; // purple
    default:
      return "#3B82F6";
  }
}

function CondoMarker({ condo, onClick }: { condo: Condo; onClick: () => void }) {
  const color = getMarkerColor(condo.status);
  
  return (
    <AdvancedMarker
      position={{ lat: condo.latitude!, lng: condo.longitude! }}
      onClick={onClick}
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform"
        style={{ backgroundColor: color }}
      >
        {condo.district || "?"}
      </div>
    </AdvancedMarker>
  );
}

function MapContent({ condos }: MapViewProps) {
  const map = useMap();
  const [selectedCondo, setSelectedCondo] = useState<Condo | null>(null);

  const validCondos = useMemo(
    () => condos.filter((c) => c.latitude && c.longitude),
    [condos]
  );

  const handleMarkerClick = useCallback((condo: Condo) => {
    setSelectedCondo(condo);
  }, []);

  return (
    <>
      {validCondos.map((condo) => (
        <CondoMarker
          key={condo.id}
          condo={condo}
          onClick={() => handleMarkerClick(condo)}
        />
      ))}
      
      {selectedCondo && selectedCondo.latitude && selectedCondo.longitude && (
        <InfoWindow
          position={{ lat: selectedCondo.latitude, lng: selectedCondo.longitude }}
          onCloseClick={() => setSelectedCondo(null)}
        >
          <div className="p-2 max-w-xs">
            <Link href={`/condo/${selectedCondo.id}`} className="hover:underline">
              <h3 className="font-semibold text-base mb-1">{selectedCondo.name}</h3>
            </Link>
            {selectedCondo.developer && (
              <p className="text-sm text-gray-600 mb-2">{selectedCondo.developer}</p>
            )}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={selectedCondo.status === "launched" ? "success" : "info"}>
                {getStatusLabel(selectedCondo.status)}
              </Badge>
              {selectedCondo.tenure && (
                <Badge variant="outline">{selectedCondo.tenure}</Badge>
              )}
            </div>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-gray-500">District:</span>{" "}
                {selectedCondo.district ? DISTRICTS[selectedCondo.district] : "TBA"}
              </p>
              <p>
                <span className="text-gray-500">PSF:</span>{" "}
                {selectedCondo.min_psf && selectedCondo.max_psf
                  ? `$${selectedCondo.min_psf.toLocaleString()} - $${selectedCondo.max_psf.toLocaleString()}`
                  : formatPSF(selectedCondo.min_psf)}
              </p>
              <p>
                <span className="text-gray-500">TOP:</span> {selectedCondo.expected_top || "TBA"}
              </p>
            </div>
            <Link
              href={`/condo/${selectedCondo.id}`}
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              View Details →
            </Link>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function MapView({ condos }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="mb-2">Map unavailable</p>
          <p className="text-sm">Google Maps API key not configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={SINGAPORE_CENTER}
          defaultZoom={12}
          mapId="sg-condos-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          <MapContent condos={condos} />
        </Map>
      </APIProvider>
    </div>
  );
}
