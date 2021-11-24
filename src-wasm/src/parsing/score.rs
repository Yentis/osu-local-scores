use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Deserialize)]
pub struct Score {
    pub gamemode: u8,
    pub score: u32,
    pub count300: usize,
    pub count100: usize,
    pub count50: usize,
    #[serde(rename="countKatsu")]
    pub count_katsu: usize,
    pub misses: usize,
    pub combo: usize,
    pub mods: u32
}

#[wasm_bindgen]
#[derive(Default, Serialize)]
pub struct PpOutput {
    pub pp: Option<f64>,
    #[wasm_bindgen(js_name="maxPp")]
    #[serde(rename="maxPp")]
    pub max_pp: Option<f64>,
    #[wasm_bindgen(js_name="maxCombo")]
    #[serde(rename="maxCombo")]
    pub max_combo: Option<usize>
}
