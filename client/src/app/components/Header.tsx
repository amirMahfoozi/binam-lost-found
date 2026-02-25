import React from "react";
import { PackageOpen } from "lucide-react";

export function Header() {
  return (
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

          {/* Right side intentionally empty now */}
          <div />
        </div>
      </div>
    </div>
  );
}