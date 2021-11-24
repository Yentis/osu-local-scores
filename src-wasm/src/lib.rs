use osu_db::listing::Listing;
use osu_db::score::ScoreList;
use parsing::score::{Score, PpOutput};
use parsing::ResultEntry;
use rosu_pp::{Beatmap, BeatmapExt, PerformanceAttributes};
use std::{collections::HashMap};
use wasm_bindgen::prelude::*;
mod parsing;
mod replay;

#[wasm_bindgen(js_name="getBeatmaps")]
pub fn get_beatmaps(osu_buffer: &[u8], scores_buffer: &[u8]) -> JsValue {
    let listing = Listing::from_bytes(osu_buffer).unwrap_throw();
    let mut beatmap_map: HashMap<String, osu_db::listing::Beatmap> = HashMap::with_capacity(listing.beatmaps.len());

    for beatmap in listing.beatmaps {
        if let Some(hash) = beatmap.hash.clone() {
            beatmap_map.insert(hash, beatmap);
        }
    }

    let score_list = ScoreList::from_bytes(scores_buffer).unwrap_throw();
    let mut results: HashMap<String, ResultEntry> = HashMap::with_capacity(score_list.beatmaps.len());
    
    for beatmap_scores_entry in score_list.beatmaps {
        let scores = if beatmap_scores_entry.scores.is_empty() {
            continue;
        } else {
            beatmap_scores_entry.scores
        };

        let hash = match beatmap_scores_entry.hash {
            Some(hash) => hash,
            None => continue
        };

        let beatmap = match beatmap_map.get(&hash) {
            Some(beatmap) => beatmap,
            None => continue
        };

        let result_entry = ResultEntry { beatmap, scores };
        results.insert(hash, result_entry);
    }

    JsValue::from_serde(&results).unwrap_throw()
}

#[wasm_bindgen(js_name="calculatePp")]
pub fn calculate_pp(gamemode: u8, scores: &JsValue, map_buffer: &[u8]) -> Vec<JsValue> {
    let beatmap = Beatmap::parse(map_buffer).unwrap_throw();
    let parsed_scores: Vec<Score> = JsValue::into_serde(scores).unwrap_throw();
    let mut mod_map: HashMap<u32, PerformanceAttributes> = HashMap::new();

    parsed_scores
        .into_iter()
        .map(|score| {
            // TODO CONVERTS
            if score.gamemode != gamemode {
                return JsValue::from_serde(&PpOutput::default()).unwrap_throw();
            }

            let max_attributes = match mod_map.get(&score.mods) {
                Some(attributes) => attributes.clone(),
                None => beatmap.pp().mods(score.mods).calculate()
            };
            let max_pp = max_attributes.pp();
            let max_combo = match &max_attributes {
                PerformanceAttributes::Osu(osu) => Some(osu.difficulty.max_combo),
                PerformanceAttributes::Fruits(fruits) => Some(fruits.difficulty.max_combo),
                PerformanceAttributes::Taiko(taiko) => Some(taiko.difficulty.max_combo),
                _ => None
            };

            let attributes = beatmap.pp()
                .mods(score.mods)
                .attributes(max_attributes.clone())
                .misses(score.misses)
                .combo(score.combo)
                .n300(score.count300)
                .n100(score.count100)
                .n50(score.count50)
                .n_katu(score.count_katsu)
                .score(score.score)
                .calculate();

            mod_map.entry(score.mods).or_insert(max_attributes);
            let result = PpOutput {
                pp: Some(attributes.pp()),
                max_pp: Some(max_pp),
                max_combo
            };

            JsValue::from_serde(&result).unwrap_throw()
        }).collect()
}
