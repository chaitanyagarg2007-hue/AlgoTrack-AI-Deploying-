import { api } from './client';

/**
 * Register a new user
 * @param {Object} data { username, email, password, full_name, college }
 */
export const registerUser = async (data) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

/**
 * Log in an existing user
 * @param {Object} data { username_or_email, password }
 */
export const loginUser = async (data) => {
  const response = await api.post('/auth/login', data);
  return response.data;
};

/**
 * Fetch authenticated user's profile and connected platform handles
 */
export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

/**
 * Update user coding handles (LeetCode, Codeforces, CodeChef, College)
 * @param {Object} handles { leetcode, codeforces, codechef, college, full_name }
 */
export const updateUserHandles = async (handles) => {
  const response = await api.post('/user/handles', handles);
  return response.data;
};
