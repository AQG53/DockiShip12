import { useEffect, useState } from "react";

export function useCountryOptions() {
  const [countries, setCountries] = useState(["Select"]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let aborted = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch("https://restcountries.com/v3.1/all?fields=cca2,name");
        const data = await res.json();
        if (aborted) return;
        const items = Array.isArray(data)
          ? data
              .map((c) => ({
                value: String(c?.cca2 || "").toUpperCase(),
                label: c?.name?.common
                  ? `${c.name.common} (${String(c?.cca2 || "").toUpperCase()})`
                  : String(c?.cca2 || ""),
              }))
              .filter((item) => item.value && item.label)
              .sort((a, b) => a.label.localeCompare(b.label))
          : [];
        setCountries(["Select", ...items]);
      } catch (err) {
        if (!aborted) console.error("Failed to load country codes", err);
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    load();
    return () => {
      aborted = true;
    };
  }, []);

  return { countries, loading };
}
