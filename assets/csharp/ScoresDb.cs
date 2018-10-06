using osu.Shared;
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
                List<List<double>> maniaPPData = new List<List<double>>();

                foreach(var replay in replays)
                {
                    double starRating = 0;
                    List<double> ppdata = new List<double>();

                    switch (replay.GameMode)
                    {
                        case GameMode.Taiko:
                            beatmapdata.DiffStarRatingTaiko.TryGetValue(replay.Mods, out starRating);
                            break;
                        case GameMode.Mania:
                            beatmapdata.DiffStarRatingMania.TryGetValue(replay.Mods, out starRating);
                            var objectCount = beatmapdata.CountSliders + beatmapdata.CountHitCircles;
                            var maniaPP = new ManiaPerformanceCalculator(replay.Mods, objectCount, beatmapdata.OveralDifficulty, replay.Score, starRating);
                            ppdata = maniaPP.ppValues;
                            break;
                    }

                    starRatingsTaiko.Add(starRating);
                    maniaPPData.Add(ppdata);
                }

                scoresList.Add(new Score(name, path, starRatingsTaiko, maniaPPData, beatmapdata.OveralDifficulty, beatmapdata.BeatmapId, beatmapdata.BeatmapSetId, replays));
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
    public List<List<double>> maniaPPData;
    public float overallDifficulty;
    public int beatmap_id;
    public int beatmapset_id;
    public List<Replay> replays;

    public Score(string name, string path, List<double> starRatingsTaiko, List<List<double>> maniaPPData, float overallDifficulty, int beatmap_id, int beatmapset_id, List<Replay> replays)
    {
        this.name = name;
        this.path = path;
        this.starRatingsTaiko = starRatingsTaiko;
        this.maniaPPData = maniaPPData;
        this.overallDifficulty = overallDifficulty;
        this.beatmap_id = beatmap_id;
        this.beatmapset_id = beatmapset_id;
        this.replays = replays;
    }
}

public class ManiaPerformanceCalculator
{
    private readonly int score = 0;
    private double realScore = 0;
    private readonly double scoreMultiplier = 1;
    private readonly double stars = 0;
    private readonly float overallDifficulty = 0;
    private readonly int noteCount = 0;
    public List<double> ppValues = new List<double>();
    private readonly Mods mods = Mods.None;
    private static readonly double MAX_SCORE = 1000000;

    public ManiaPerformanceCalculator(Mods mods, int noteCount, float overallDifficulty, int score, double stars)
    {
        this.mods = mods;
        this.noteCount = noteCount;
        this.overallDifficulty = overallDifficulty;
        this.score = score;
        this.stars = stars;

        if ((mods & Mods.NoFail) > 0)
        {
            scoreMultiplier *= 0.5;
        }
        if((mods & Mods.Easy) > 0)
        {
            scoreMultiplier *= 0.5;
        }
        if((mods & Mods.HalfTime) > 0)
        {
            scoreMultiplier *= 0.5;
        }

        ComputePPValues();
    }

    private void ComputePPValues()
    {
        double multiplier = ComputeMultiplier();

        double strainValue = ComputeStrainValue(score);
        double accValue = ComputeAccValue(strainValue, score);
        ppValues.Add(ComputeTotalPP(strainValue, accValue, multiplier));

        strainValue = ComputeStrainValue(MAX_SCORE);
        accValue = ComputeAccValue(strainValue, MAX_SCORE);
        ppValues.Add(ComputeTotalPP(strainValue, accValue, multiplier));
    }

    private double ComputeMultiplier()
    {
        double multiplier = 0.8;

        if ((mods & Mods.NoFail) > 0)
        {
            multiplier *= 0.90;
        }

        if ((mods & Mods.SpunOut) > 0)
        {
            multiplier *= 0.95;
        }

        if ((mods & Mods.Easy) > 0)
        {
            multiplier *= 0.5;
        }

        return multiplier;
    }

    private double ComputeStrainValue(double score)
    {
        if(scoreMultiplier <= 0)
        {
            return 0;
        }

        realScore = score * (1 / scoreMultiplier);
        double strainValue = Math.Pow(5 * Math.Max(1, stars / 0.2) - 4, 2.2) / 135;
        strainValue *= 1 + 0.1 * Math.Min(1, noteCount / 1500);

        if (score <= 500000)
        {
            strainValue = 0;
        }
        else if (score <= 600000)
        {
            strainValue *= 0.3 * ((score - 500000.0) / 100000);
        }
        else if (score <= 700000)
        {
            strainValue *= 0.3 + 0.25 * ((score - 600000.0) / 100000);
        }
        else if (score <= 800000)
        {
            strainValue *= 0.55 + 0.2 * ((score - 700000.0) / 100000);
        }
        else if (score <= 900000)
        {
            strainValue *= 0.75 + 0.15 * ((score - 800000.0) / 100000);
        }
        else
        {
            strainValue *= 0.9 + 0.1 * ((score - 900000.0) / 100000);
        }

        return strainValue;
    }

    private double ComputeAccValue(double strain, double score)
    {
        double hitWindow300 = 34 + 3 * Math.Min(10, Math.Max(0, 10 - overallDifficulty));

        if(hitWindow300 <= 0)
        {
            return 0;
        }

        return Math.Max(0, 0.2 - ((hitWindow300 - 34) * 0.006667)) * strain * Math.Pow(Math.Max(0, realScore - 960000) / 40000, 1.1);
    }

    private double ComputeTotalPP(double strainValue, double accValue, double multiplier)
    {
        return Math.Pow(Math.Pow(strainValue, 1.1) + Math.Pow(accValue, 1.1), 1 / 1.1) * multiplier;
    }
}