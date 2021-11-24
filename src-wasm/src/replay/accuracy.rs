use osu_db::Replay;

pub fn get_accuracy_standard(replay: &Replay) -> f32 {
  let count_300 = f32::from(replay.count_300);
  let count_100 = f32::from(replay.count_100);
  let count_50 = f32::from(replay.count_50);
  let count_0 = f32::from(replay.count_miss);

  let dividend = (50.0 * count_50) + (100.0 * count_100) + (300.0 * count_300);
  let divider = 300.0 * (count_0 + count_50 + count_100 + count_300);

  (dividend / divider) * 100.0
}

pub fn get_accuracy_taiko(replay: &Replay) -> f32 {
  let count_great = f32::from(replay.count_300);
  let count_good = f32::from(replay.count_100);
  let count_bad = f32::from(replay.count_miss);

  let dividend = (0.5 * count_good) + (count_great);
  let divider = count_bad + count_good + count_great;

  (dividend / divider) * 100.0
}

pub fn get_accuracy_catch(replay: &Replay) -> f32 {
  let count_fruit = f32::from(replay.count_300);
  let count_drop = f32::from(replay.count_100);
  let count_droplet = f32::from(replay.count_50);
  let count_miss_droplet = f32::from(replay.count_katsu);
  let count_miss_drop_fruit = f32::from(replay.count_miss);

  let dividend = count_droplet + count_drop + count_fruit;
  let divider = count_miss_droplet + count_miss_drop_fruit + count_droplet + count_drop + count_fruit;

  (dividend / divider) * 100.0
}

pub fn get_accuracy_mania(replay: &Replay) -> f32 {
  let count_max = f32::from(replay.count_geki);
  let count_300 = f32::from(replay.count_300);
  let count_200 = f32::from(replay.count_katsu);
  let count_100 = f32::from(replay.count_100);
  let count_50 = f32::from(replay.count_50);
  let count_0 = f32::from(replay.count_miss);

  let dividend = (50.0 * count_50) + (100.0 * count_100) + (200.0 * count_200) + (300.0 * (count_300 + count_max));
  let divider = 300.0 * (count_0 + count_50 + count_100 + count_200 + count_300 + count_max);

  (dividend / divider) * 100.0
}
