#define OPPAI_IMPLEMENTATION
#include <nan.h>
#include "../../assets/c/oppai.c"

// NAN_METHOD is a Nan macro enabling convenient way of creating native node functions.
// It takes a method's name as a param. By C++ convention, I used the Capital cased name.
NAN_METHOD(Hello) {
    struct parser pstate;
    struct beatmap map;

    uint32_t mods;
    struct diff_calc stars;
    struct pp_calc pp;

    p_init(&pstate);
    p_map(&pstate, &map, fopen("C:/Users/Yentl-PC/AppData/Local/osu!/Songs/579451 USAO - Extra Mode/USAO - Extra Mode (_MiaoFUuU_) [Rhythm Crisis].osu", "r"));

    mods = MODS_HD | MODS_DT;

    d_init(&stars);
    d_calc(&stars, &map, mods);

    b_ppv2(&map, &pp, stars.aim, stars.speed, mods);

    // Create an instance of V8's String type
    auto message = Nan::New("Hello from C++!").ToLocalChecked();
    // 'info' is a macro's "implicit" parameter - it's a bridge object between C++ and JavaScript runtimes
    // You would use info to both extract the parameters passed to a function as well as set the return value.
    info.GetReturnValue().Set(stars.total);
}

// Module initialization logic
NAN_MODULE_INIT(Initialize) {
    // Export the `Hello` function (equivalent to `export function Hello (...)` in JS)
    NAN_EXPORT(target, Hello);
}

// Create the module called "addon" and initialize it with `Initialize` function (created with NAN_MODULE_INIT macro)
NODE_MODULE(addon, Initialize);