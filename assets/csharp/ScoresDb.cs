using OppaiSharp;
using osu_database_reader.BinaryFiles;
using osu_database_reader.Components.Beatmaps;
using osu_database_reader.Components.Player;
using System;
using System.Collections.Generic;
using System.IO;
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

                scoresList.Add(new Score(name, path, beatmapdata.BeatmapId, beatmapdata.BeatmapSetId, replays));
            }
        }

        return scoresList;
    }
}

public class Score
{
    public string name;
    public string path;
    public int beatmap_id;
    public int beatmapset_id;
    public int max_combo = 0;
    public List<Replay> replays;
    public List<double> pp = new List<double>();

    public Score(string name, string path, int beatmap_id, int beatmapset_id, List<Replay> replays)
    {
        this.name = name;
        this.path = path;
        this.beatmap_id = beatmap_id;
        this.beatmapset_id = beatmapset_id;
        this.replays = replays;

        /*for(var i = 0; i < replays.Count; i++)
        {
            pp.Add(CalcPP(replays[i]));
        }*/
    }

    /*public double CalcPP(Replay replay)
    {
        if (replay.GameMode == osu.Shared.GameMode.Standard)
        {
            //beatmap to streamreader
            try
            {
                byte[] data = File.ReadAllBytes(path);
                var stream = new MemoryStream(data, false);
                var reader = new StreamReader(stream);

                //read beatmap
                var beatmap = Beatmap.Read(reader);

                //get mods
                Mods mods = (Mods)replay.Mods;
                var diff = new DiffCalc().Calc(beatmap, mods);

                //calc pp
                var replayData = replay;
                try
                {
                    //if we don't know max combo yet set it
                    if(max_combo == 0)
                    {
                        max_combo = beatmap.GetMaxCombo();
                    }

                    var pp = new PPv2(new PPv2Parameters(beatmap, diff, c100: replay.Count100, c50: replay.Count50, cMiss: replay.CountMiss, combo: replay.Combo, c300: replay.Count300, mods: mods));
                    return pp.Total;
                }
                catch (ArgumentOutOfRangeException)
                {
                    return 0;
                }
            } catch(FileNotFoundException)
            {
                return 0;
            }
        } else
        {
            return 0;
        }
    }*/
}