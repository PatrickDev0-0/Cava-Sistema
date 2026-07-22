import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Assina alterações em tempo real das entidades informadas e dispara onChange a cada evento.
export function useRealtimeSync(entityNames, onChange) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    const unsubs = entityNames.map((name) =>
      base44.entities[name]?.subscribe?.(() => cb.current())
    );
    return () => unsubs.forEach((u) => u && u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityNames.join(",")]);
}