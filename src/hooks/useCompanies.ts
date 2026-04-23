import { useState, useEffect } from 'react';
import { getCompanies } from '../services/db';

export interface CompanyOption {
  id: string;
  label: string;
  color: string;
  textColor: string;
  name: string;
  abbreviation: string;
}

// Fallback estático con los colores y labels que usan ADC/Powers/ModulosT4
const FALLBACK: CompanyOption[] = [
  { id: 'c1', label: 'Sunset', color: '#92d050', textColor: 'black', name: 'Grupo Sunset', abbreviation: 'SUN' },
  { id: 'c2', label: 'XCA',    color: '#948a54', textColor: 'white', name: 'Grupo Xcaret',  abbreviation: 'XCA' },
  { id: 'c3', label: 'VDP',    color: '#f8cbad', textColor: 'black', name: 'Villa del Palmar', abbreviation: 'VDP' },
  { id: 'c4', label: 'CID',    color: '#bdd7ee', textColor: 'black', name: 'El Cid',        abbreviation: 'CID' },
  { id: 'c5', label: 'KRY',    color: '#ffff00', textColor: 'black', name: 'Krystal',       abbreviation: 'KRY' },
  { id: 'c6', label: 'KRY G',  color: '#afafaf', textColor: 'black', name: 'Krystal Grand', abbreviation: 'KRY G' },
];

export function useCompanies() {
  const [companies, setCompanies] = useState<CompanyOption[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompanies().then(data => {
      if (data && data.length > 0) {
        const mapped: CompanyOption[] = data
          .filter((c: any) => c.id)
          .map((c: any) => ({
            id: c.id as string,
            label: c.short_name || c.abbreviation || c.name,
            color: c.color || '#cccccc',
            textColor: c.text_color || '#000000',
            name: c.name,
            abbreviation: c.abbreviation || '',
          }));
        // Conservar el orden c1..c6 si existe
        mapped.sort((a, b) => a.id.localeCompare(b.id));
        if (mapped.length > 0) setCompanies(mapped);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return { companies, loading };
}
