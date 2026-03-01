"use client";

import { useState, useEffect } from "react";
import { CondoCard } from "@/components/CondoCard";
import { useShortlist } from "@/components/ShortlistButton";
import { type Condo } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Trash2, Share2 } from "lucide-react";

export default function ShortlistPage() {
  const shortlistIds = useShortlist();
  const [condos, setCondos] = useState<Condo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCondos() {
      if (shortlistIds.length === 0) {
        setCondos([]);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/condos?ids=${shortlistIds.join(",")}`);
        if (response.ok) {
          const data = await response.json();
          setCondos(data.condos);
        }
      } catch (error) {
        console.error("Failed to fetch shortlisted condos:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCondos();
  }, [shortlistIds]);

  const clearShortlist = () => {
    localStorage.setItem("shortlist", "[]");
    window.dispatchEvent(new CustomEvent("shortlistUpdate", { detail: [] }));
  };

  const shareShortlist = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("ids", shortlistIds.join(","));
    navigator.clipboard.writeText(url.toString());
    alert("Shortlist link copied to clipboard!");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Your Shortlist</h1>
          <p className="text-muted-foreground">
            {shortlistIds.length} condos saved for comparison
          </p>
        </div>

        {shortlistIds.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={shareShortlist}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="destructive" onClick={clearShortlist}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : shortlistIds.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <h3 className="text-lg font-medium mb-2">No condos shortlisted</h3>
          <p className="text-muted-foreground mb-4">
            Browse condos and click the heart icon to add them to your shortlist.
          </p>
          <a href="/" className="inline-flex items-center justify-center h-9 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors">
            Browse Condos
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {condos.map((condo) => (
            <CondoCard key={condo.id} condo={condo} />
          ))}
        </div>
      )}

      {/* Comparison table for shortlisted condos */}
      {condos.length >= 2 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-3 text-left">Property</th>
                  {condos.map((c) => (
                    <th key={c.id} className="border p-3 text-left min-w-[200px]">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-3 font-medium">Developer</td>
                  {condos.map((c) => (
                    <td key={c.id} className="border p-3">
                      {c.developer || "TBA"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border p-3 font-medium">District</td>
                  {condos.map((c) => (
                    <td key={c.id} className="border p-3">
                      D{c.district || "?"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Tenure</td>
                  {condos.map((c) => (
                    <td key={c.id} className="border p-3">
                      {c.tenure || "TBA"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Total Units</td>
                  {condos.map((c) => (
                    <td key={c.id} className="border p-3">
                      {c.total_units || "TBA"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border p-3 font-medium">PSF Range</td>
                  {condos.map((c) => (
                    <td key={c.id} className="border p-3">
                      {c.min_psf && c.max_psf
                        ? `$${c.min_psf.toLocaleString()} - $${c.max_psf.toLocaleString()}`
                        : "TBA"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border p-3 font-medium">Expected TOP</td>
                  {condos.map((c) => (
                    <td key={c.id} className="border p-3">
                      {c.expected_top || "TBA"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
