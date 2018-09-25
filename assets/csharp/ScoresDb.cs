using osu_database_reader.BinaryFiles;
using osu_database_reader.Components.Beatmaps;
using osu_database_reader.Components.Player;
using System;
using System.Collections.Generic;
using System.Linq;
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
            if(b.BeatmapChecksum != null && !beatmaps.ContainsKey(b.BeatmapChecksum))
            {
                beatmaps.Add(b.BeatmapChecksum, b);
            }
        }

        ScoresDb db2 = ScoresDb.Read(PathOsu + "/scores.db");
        var scoresList = new List<Score>();

        foreach (var beatmap in db2.Beatmaps)
        {
            if(beatmaps.ContainsKey(beatmap.Key))
            {
                var beatmapdata = beatmaps[beatmap.Key];
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
                var replays = beatmap.Value;

                scoresList.Add(new Score(name, beatmapdata.BeatmapId, beatmapdata.BeatmapSetId, replays));
            }
        }

        return scoresList;
    }
}

public class Score
{
    public string name;
    public int beatmap_id;
    public int beatmapset_id;
    public List<Replay> replays;

    public Score(string name, int beatmap_id, int beatmapset_id, List<Replay> replays)
    {
        this.name = name;
        this.beatmap_id = beatmap_id;
        this.beatmapset_id = beatmapset_id;
        this.replays = replays;
    }
}