import math
import unittest
from datetime import datetime, timedelta, timezone

from app import bayesian_average, compute_recency_factor, decade_alignment_bonus


class RecommenderUtilsTests(unittest.TestCase):
    def test_compute_recency_factor_prefers_recent(self):
        now = datetime.now(timezone.utc)
        recent = compute_recency_factor(now - timedelta(days=7))
        old = compute_recency_factor(now - timedelta(days=730))

        self.assertGreater(recent, old)
        self.assertGreaterEqual(recent, 0.0)
        self.assertLessEqual(recent, 1.0)

    def test_bayesian_average_shrinks_low_vote_movies(self):
        high_count = bayesian_average(8.5, 50_000)
        low_count = bayesian_average(9.0, 10)

        self.assertGreater(high_count, 8.0)
        self.assertLess(low_count, 8.0)

    def test_decade_alignment_bonus_scales_with_distribution(self):
        dist = {1990: 3, 2000: 9}
        bonus_2000 = decade_alignment_bonus(2004, dist)
        bonus_1990 = decade_alignment_bonus(1997, dist)

        self.assertGreater(bonus_2000, bonus_1990)
        self.assertTrue(math.isclose(bonus_2000, 0.075, rel_tol=0.2))


if __name__ == "__main__":
    unittest.main()
