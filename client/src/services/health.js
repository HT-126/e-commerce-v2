import { api } from '../lib/api.js';

export const getHealth = () => api('/health');
