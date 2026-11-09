import axios from 'axios';

export async function fetchLeetCodeData(username) {
  if (!username) return null;

  const query = `
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          userAvatar
          ranking
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
        tagProblemCounts {
          advanced {
            tagName
            problemsSolved
          }
          intermediate {
            tagName
            problemsSolved
          }
          fundamental {
            tagName
            problemsSolved
          }
        }
      }
    }
  `;

  try {
    const res = await axios.post(
      'https://leetcode.com/graphql',
      { query, variables: { username } },
      {
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      }
    );

    const user = res.data?.data?.matchedUser;
    if (!user) return null;

    const diffBreakdown = {};
    let totalSolved = 0;
    const acSubs = user.submitStatsGlobal?.acSubmissionNum || [];
    for (const item of acSubs) {
      if (item.difficulty === 'All') {
        totalSolved = item.count;
      } else {
        diffBreakdown[item.difficulty] = item.count;
      }
    }

    const topicCounts = {};
    const tagSections = ['fundamental', 'intermediate', 'advanced'];
    for (const sec of tagSections) {
      const tags = user.tagProblemCounts?.[sec] || [];
      for (const t of tags) {
        topicCounts[t.tagName] = (topicCounts[t.tagName] || 0) + t.problemsSolved;
      }
    }

    return {
      platform: 'LeetCode',
      username,
      avatar: user.profile?.userAvatar,
      ranking: user.profile?.ranking || 0,
      total_solved: totalSolved,
      difficulty: diffBreakdown,
      topic_counts: topicCounts
    };
  } catch (err) {
    console.warn(`LeetCode fetch failed for @${username}:`, err.message);
    return null;
  }
}
