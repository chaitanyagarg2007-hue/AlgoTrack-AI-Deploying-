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
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        topPercentage
      }
      userContestRankingHistory(username: $username) {
        attended
        rating
        ranking
        contest {
          title
          startTime
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

    const contestRanking = res.data?.data?.userContestRanking;
    const rawContestHistory = res.data?.data?.userContestRankingHistory || [];
    const contestHistory = rawContestHistory
      .filter(h => h.attended)
      .map(h => ({
        platform: 'LeetCode',
        contestName: h.contest?.title || 'LeetCode Contest',
        rating: Math.round(h.rating),
        date: new Date((h.contest?.startTime || 0) * 1000).toISOString(),
        timestamp: h.contest?.startTime || 0,
        ranking: h.ranking
      }));

    return {
      platform: 'LeetCode',
      username,
      avatar: user.profile?.userAvatar,
      ranking: user.profile?.ranking || 0,
      contest_rating: contestRanking?.rating ? Math.round(contestRanking.rating) : 0,
      global_ranking: contestRanking?.globalRanking || 0,
      total_solved: totalSolved,
      difficulty: diffBreakdown,
      topic_counts: topicCounts,
      rating_history: contestHistory
    };
  } catch (err) {
    console.warn(`LeetCode fetch failed for @${username}:`, err.message);
    return null;
  }
}
