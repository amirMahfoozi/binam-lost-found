import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Item {
  id: string;
  title: string;
  description: string;
  status: "LOST" | "FOUND";
  latitude: number;
  longitude: number;
  images: { id: string; url: string; position: number }[];
  tags: { id: number; name: string }[];
  createdAt: string;
}

interface ItemsResponse {
  items: Item[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export default function ItemsPage() {
  const [data, setData] = useState<ItemsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth(); // not needed for GET, but handy later

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    apiFetch<ItemsResponse>("/items")
      .then((res) => {
        if (mounted) setData(res);
      })
      .catch((err: any) => {
        if (mounted) setError(err.message || "Failed to load items");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Recent items</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.items.map((item) => (
            <div key={item.id} className="border rounded p-3 space-y-2">
              <div className="flex justify-between items-center">
                <h2 className="font-medium">{item.title}</h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    item.status === "LOST"
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              {item.images[0] && (
                <img
                  src={item.images[0].url}
                  alt={item.title}
                  className="w-full h-32 object-cover rounded"
                />
              )}
              <p className="text-sm text-gray-700 line-clamp-3">
                {item.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-xs px-2 py-0.5 bg-gray-100 rounded"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
