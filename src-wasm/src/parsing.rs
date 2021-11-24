use osu_db::{Replay, listing::Beatmap};
use serde::{Serialize, ser::{SerializeMap, SerializeSeq}};
use crate::replay;
pub mod score;

struct ReplayWrapper<'replay>(&'replay Replay);

impl Serialize for ReplayWrapper<'_> {
    fn serialize<S>(&self, s: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer, {
        let mut map = s.serialize_map(Some(13))?;

        map.serialize_entry("gamemode", &self.0.mode.raw())?;
        map.serialize_entry("score", &self.0.score)?;
        map.serialize_entry("count300", &self.0.count_300)?;
        map.serialize_entry("count100", &self.0.count_100)?;
        map.serialize_entry("count50", &self.0.count_50)?;
        map.serialize_entry("countGeki", &self.0.count_geki)?;
        map.serialize_entry("countKatsu", &self.0.count_katsu)?;
        map.serialize_entry("misses", &self.0.count_miss)?;
        map.serialize_entry("combo", &self.0.max_combo)?;
        map.serialize_entry("mods", &self.0.mods.bits())?;
        map.serialize_entry("date", &self.0.timestamp)?;

        let accuracy = replay::get_accuracy(self.0);
        map.serialize_entry("accuracy", &accuracy)?;

        let grade = replay::get_grade(accuracy, self.0);
        map.serialize_entry("grade", &(grade as u8))?;

        map.end()
    }
}

struct ReplaysWrapper<'list>(&'list [Replay]);

impl Serialize for ReplaysWrapper<'_> {
    fn serialize<S>(&self, s: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer, {
        let mut list = s.serialize_seq(Some(self.0.len()))?;

        for replay in self.0.iter().map(ReplayWrapper) {
            list.serialize_element(&replay)?;
        }

        list.end()
    }
}

struct BeatmapWrapper<'map>(&'map Beatmap);

impl Serialize for BeatmapWrapper<'_> {
    fn serialize<S>(&self, s: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer, {
        let mut map = s.serialize_map(Some(7))?;

        let maybe_artist = self.0.artist_ascii.as_ref()
            .or_else(|| self.0.artist_unicode.as_ref());

        let artist = match maybe_artist {
            Some(artist) => artist,
            None => ""
        };

        let maybe_title = self.0.title_ascii.as_ref()
            .or_else(|| self.0.title_unicode.as_ref());

        let title = match maybe_title {
            Some(title) => title,
            None => ""
        };

        let version = match &self.0.difficulty_name {
            Some(version) => version,
            None => ""
        };

        let name = format!("{} - {} [{}]", artist, title, version);
        map.serialize_entry("name", &name)?;
        map.serialize_entry("beatmapId", &self.0.beatmap_id)?;
        map.serialize_entry("beatmapsetId", &self.0.beatmapset_id)?;
        map.serialize_entry("gamemode", &self.0.mode.raw())?;
        map.serialize_entry("status", &self.0.status.raw())?;
        map.serialize_entry("hash", &self.0.hash)?;
        
        let file_path = get_file_path(self.0);
        map.serialize_entry("filePath", &file_path)?;

        map.end()
    }
}

fn get_file_path(beatmap: &Beatmap) -> Option<String> {
    let folder_name = beatmap.folder_name.as_ref()?;
    let file_name = beatmap.file_name.as_ref()?;

    Some(format!("{}/{}", folder_name, file_name))
}

pub struct ResultEntry<'content> {
    pub beatmap: &'content Beatmap,
    pub scores: Vec<Replay>
}

impl Serialize for ResultEntry<'_> {
    fn serialize<S>(&self, s: S) -> Result<S::Ok, S::Error>
    where S: serde::Serializer, {
        let mut map = s.serialize_map(Some(2))?;

        let map_wrapper = BeatmapWrapper(self.beatmap);
        map.serialize_entry("beatmap", &map_wrapper)?;

        let replays_wrapper = ReplaysWrapper(&self.scores);
        map.serialize_entry("scores", &replays_wrapper)?;

        map.end()
    }
}
