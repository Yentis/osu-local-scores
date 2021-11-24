use osu_db::{Mod, Replay};

#[repr(u8)]
pub enum Grade {
  D,
  C,
  B,
  A,
  S,
  SH,
  SS,
  XH
}

pub fn get_grade_standard(replay: &Replay) -> Grade {
  let count_300 = f32::from(replay.count_300);
  let count_100 = f32::from(replay.count_100);
  let count_50 = f32::from(replay.count_50);
  let count_0 = f32::from(replay.count_miss);

  let amount_of_notes = count_300 + count_100 + count_50 + count_0;
  let percent_300 = count_300 / amount_of_notes;
  let percent_50 = count_50 / amount_of_notes;

  if percent_300 > 0.9 && percent_50 < 0.01 && count_0 < 1.0 {
    if replay.mods.contains(Mod::Hidden) || replay.mods.contains(Mod::Flashlight) {
      return Grade::SH;
    }
    return Grade::S;
  }

  if (percent_300 > 0.8 && count_0 < 1.0) || percent_300 > 0.9 {
    return Grade::A;
  }

  if (percent_300 > 0.7 && count_0 < 1.0) || percent_300 > 0.8 {
    return Grade::B;
  }

  if percent_300 > 0.6 {
    return Grade::C;
  }

  Grade::D
}

pub fn get_grade_taiko_mania(accuracy: f32, replay: &Replay) -> Grade {
  if accuracy > 95.0 {
    if replay.mods.contains(osu_db::Mod::Hidden) || replay.mods.contains(osu_db::Mod::Flashlight) {
      return Grade::SH;
    }
    return Grade::S;
  }

  if accuracy > 90.0 {
    return Grade::A;
  }

  if accuracy > 80.0 {
    return Grade::B;
  }

  if accuracy > 70.0 {
    return Grade::C;
  }

  Grade::D
}

pub fn get_grade_catch(accuracy: f32, replay: &Replay) -> Grade {
  if accuracy > 98.0 && accuracy < 100.0 {
    if replay.mods.contains(osu_db::Mod::Hidden) || replay.mods.contains(osu_db::Mod::Flashlight) {
      return Grade::SH;
    }
    return Grade::S;
  }

  if accuracy > 94.0 && accuracy <= 98.0 {
    return Grade::A;
  }

  if accuracy > 90.0 && accuracy <= 94.0 {
    return Grade::B;
  }

  if accuracy > 85.0 && accuracy <= 90.0 {
    return Grade::C;
  }

  Grade::D
}
