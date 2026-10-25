import { useQuery } from '@tanstack/react-query';
import { getHealth } from '../services/health.js';

export const useHealth = () => useQuery({ queryKey: ['health'], queryFn: getHealth });
