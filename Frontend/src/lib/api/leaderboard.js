import { api } from './client';

/**
 * Fetch ranked leaderboard with filters
 * @param {Object} params { college, sort_by, search, page, limit }
 */
export const getLeaderboard = async (params = {}) => {
  const response = await api.get('/leaderboard', { params });
  return response.data;
};

/**
 * Fetch aggregated college summary stats
 */
export const getCollegeSummary = async () => {
  const response = await api.get('/leaderboard/colleges');
  return response.data;
};
