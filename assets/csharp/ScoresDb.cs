using osu_database_reader.BinaryFiles;
using osu_database_reader.Components.Beatmaps;
using osu_database_reader.Components.Player;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

public class Startup
{
    public static readonly string PathOsu = "C:/Users/Yentl-PC/AppData/Local/osu!";

    public async Task<object> Invoke(object input)
    {
        OsuDb db = OsuDb.Read(PathOsu + "/osu!.db");
        var beatmaps = new Dictionary<string, BeatmapEntry>();
        for (int i = 0; i < db.Beatmaps.Count; i++)
        {   //print 10 at most
            var b = db.Beatmaps[i];
            if(b.BeatmapChecksum != null && !beatmaps.ContainsKey(b.BeatmapChecksum))
            {
                beatmaps.Add(b.BeatmapChecksum, b);
            }
        }

        ScoresDb db2 = ScoresDb.Read(PathOsu + "/scores.db");
        var scoresList = new List<Score>();

        foreach (var beatmap in db2.Beatmaps)
        {
            var beatmapdata = beatmaps[beatmap.Key];
            var name = beatmapdata.Artist + " - " + beatmapdata.Title + " [" + beatmapdata.Version + "]";
            var replays = beatmap.Value;

            scoresList.Add(new Score(name, replays));
        }

        return scoresList;
    }
}

public class Score
{
    public string name;
    public List<Replay> replays;

    public Score(string name, List<Replay> replays)
    {
        this.name = name;
        this.replays = replays;
    }
}