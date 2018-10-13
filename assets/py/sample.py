import sys

import catchthepp

m = {"NM": 0, "EZ": 2, "HD": 8, "HR": 16, "DT": 64, "HT": 256, "FL": 1024}

beatmap = catchthepp.Beatmap(sys.argv[1])
mods = m[sys.argv[2]]
acc = float(sys.argv[3])
combo = int(sys.argv[4])
miss = int(sys.argv[5])

difficulty = catchthepp.Difficulty(beatmap, mods)
print("{} {} {} {}".format(difficulty.star_rating, catchthepp.calculate_pp(difficulty, acc, combo, miss), beatmap.max_combo, catchthepp.calculate_pp(difficulty, 1, beatmap.max_combo, 0)))
