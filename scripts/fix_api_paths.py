import os
WORK = r"D:\workspace\my-prj\tercher-work\work-system\web-app\src\views"
fixes = {
    "evaluation/ReadingLog.vue": [("/api/reading-log", "/api/reading-logs")],
    "evaluation/Growth.vue": [("/api/growth", "/api/growth-entries")],
    "evaluation/GradeTrend.vue": [("/api/grades/trend", "/api/grades")],
    "evaluation/Leaderboard.vue": [("/api/leaderboard", "/api/score-records")],
    "evaluation/PickerHistory.vue": [("/api/picker/history", "/api/picker-history")],
    "tools/Reward.vue": [("/api/rewards", "/api/reward-records")],
    "classes/Gallery.vue": [("/api/gallery", "/api/class-galleries")],
    "classes/MyGallery.vue": [("/api/my-gallery", "/api/my-galleries")],
}
results = []
for subdir, entries in fixes.items():
    fp = os.path.join(WORK, subdir)
    if not os.path.exists(fp):
        results.append("SKIP " + subdir)
        continue
    with open(fp, "r", encoding="utf-8") as f:
        c = f.read()
    orig = c
    for old, new in entries:
        c = c.replace(old, new)
    if c != orig:
        with open(fp, "w", encoding="utf-8") as f:
            f.write(c)
        results.append("FIXED " + subdir)
    else:
        results.append("OK " + subdir)
for r in results:
    print(r)
print("Done:", len(results), "files")

