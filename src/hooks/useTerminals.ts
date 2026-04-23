import { useState, useEffect } from 'react';
import { getTerminals } from '../services/db';
import { Terminal } from '../types';
import { TERMINALS as TERMINALS_FALLBACK } from '../constants';

export function useTerminals() {
  const [terminals, setTerminals] = useState<Terminal[]>(TERMINALS_FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTerminals().then(data => {
      if (data && data.length > 0) {
        setTerminals(data.map(t => ({
          id: t.id,
          name: t.name,
          hasZones: t.has_zones,
          isActive: t.is_active,
          allowedCompanies: t.allowed_companies,
          allowedSchedules: t.allowed_schedules,
        })));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return { terminals, loading, setTerminals };
}