import unittest

import numpy as np

from omr_worker import detectar_gabaritos


class SheetCandidateDetectionTests(unittest.TestCase):
    def test_cut_half_a4_is_always_kept_as_a_whole_candidate(self):
        half_a4_scan = np.zeros((3508, 2480, 3), dtype=np.uint8)

        candidates = detectar_gabaritos(half_a4_scan)

        self.assertIs(candidates[0], half_a4_scan)
        self.assertEqual(candidates[0].shape, (3508, 2480, 3))

    def test_landscape_two_up_also_offers_both_halves(self):
        landscape_a4 = np.zeros((2480, 3508, 3), dtype=np.uint8)

        candidates = detectar_gabaritos(landscape_a4)

        self.assertEqual(len(candidates), 3)
        self.assertEqual(candidates[1].shape, (2480, 1754, 3))
        self.assertEqual(candidates[2].shape, (2480, 1754, 3))


if __name__ == "__main__":
    unittest.main()
