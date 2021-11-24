use osu_db::{Mod, Mode, replay::Replay};
use self::accuracy::*;
use self::grade::*;
mod accuracy;
mod grade;

pub fn get_accuracy(replay: &Replay) -> f32 {
  match replay.mode {
      Mode::Standard => get_accuracy_standard(replay),
      Mode::Taiko => get_accuracy_taiko(replay),
      Mode::CatchTheBeat => get_accuracy_catch(replay),
      Mode::Mania => get_accuracy_mania(replay)
  }
}

pub fn get_grade(accuracy: f32, replay: &Replay) -> Grade {
  if accuracy > 99.99 {
    if replay.mods.contains(Mod::Hidden) || replay.mods.contains(Mod::Flashlight) {
      return Grade::XH;
    }
    return Grade::SS;
  }

  match replay.mode {
    Mode::Standard => get_grade_standard(replay),
    Mode::Taiko | Mode::Mania => get_grade_taiko_mania(accuracy, replay),
    Mode::CatchTheBeat => get_grade_catch(accuracy, replay)
  }
}
