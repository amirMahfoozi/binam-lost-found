import React, { useState } from "react";
import { PackageOpen, MapPin } from "lucide-react";
import { MapModal } from "./MapModal"; // ✅ adjust path if needed

export function Header() {
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <>
      <div className="w-full bg-white shadow-sm border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left side: logo + title */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <PackageOpen className="size-6 text-white" />
              </div>
              <div>
                <h1 className="text-blue-900 font-semibold">Campus Lost &amp; Found</h1>
                <p className="text-sm text-gray-600">
                  Reuniting students with their belongings
                </p>
              </div>
            </div>

            {/* Right side: Map button */}
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <MapPin className="size-4" />
              Show Map
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <MapModal open={mapOpen} onClose={() => setMapOpen(false)} />
    </>
  );
}
