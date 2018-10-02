using osu_database_reader.BinaryFiles;
using osu_database_reader.Components.Beatmaps;
using osu_database_reader.Components.Player;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public class Startup
{
    public async Task<object> Invoke(string input)
    {
        string PathOsu = input;

        OsuDb db = OsuDb.Read(PathOsu + "/osu!.db");
        var beatmaps = new Dictionary<string, BeatmapEntry>();

        for (int i = 0; i < db.Beatmaps.Count; i++)
        {   //print 10 at most
            var b = db.Beatmaps[i];
            if (b.BeatmapChecksum != null && !beatmaps.ContainsKey(b.BeatmapChecksum))
            {
                beatmaps.Add(b.BeatmapChecksum, b);
            }
        }

        ScoresDb db2 = ScoresDb.Read(PathOsu + "/scores.db");
        var scoresList = new List<Score>();

        foreach (var curBeatmap in db2.Beatmaps)
        {
            if(beatmaps.ContainsKey(curBeatmap.Key))
            {
                var beatmapdata = beatmaps[curBeatmap.Key];
                var artist = "";
                var title = "";
                var version = "";

                if (beatmapdata.Artist != null)
                {
                    artist = beatmapdata.Artist;
                }
                if (beatmapdata.Title != null)
                {
                    title = beatmapdata.Title;
                }
                if (beatmapdata.Version != null)
                {
                    version = beatmapdata.Version;
                }

                var name = artist + " - " + title + " [" + version + "]";
                    var path = PathOsu + "\\Songs\\" + beatmapdata.FolderName + "\\" + beatmapdata.BeatmapFileName;
                var replays = curBeatmap.Value;

                List<double> starRatingsTaiko = new List<double>();

                foreach(var replay in replays)
                {
                    double starRating = 0;
                    beatmapdata.DiffStarRatingTaiko.TryGetValue(replay.Mods, out starRating);
                    starRatingsTaiko.Add(starRating);
                }

                scoresList.Add(new Score(name, path, starRatingsTaiko, beatmapdata.OveralDifficulty, beatmapdata.CountHitCircles, beatmapdata.BeatmapId, beatmapdata.BeatmapSetId, replays));
            }
        }

        return scoresList;
    }
}

public class Score
{
    public string name;
    public string path;
    public List<double> starRatingsTaiko;
    public float overallDifficulty;
    public ushort hitCircles;
    public int beatmap_id;
    public int beatmapset_id;
    public List<Replay> replays;

    public Score(string name, string path, List<double> starRatingsTaiko, float overallDifficulty, ushort hitCircles, int beatmap_id, int beatmapset_id, List<Replay> replays)
    {
        this.name = name;
        this.path = path;
        this.starRatingsTaiko = starRatingsTaiko;
        this.overallDifficulty = overallDifficulty;
        this.hitCircles = hitCircles;
        this.beatmap_id = beatmap_id;
        this.beatmapset_id = beatmapset_id;
        this.replays = replays;
    }
}