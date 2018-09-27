#define OPPAI_IMPLEMENTATION
#include <nan.h>
#include <string>
#include "../../assets/c/oppai.c"

namespace demo {

using v8::FunctionCallbackInfo;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::String;
using v8::Value;
using v8::Array;
using v8::Number;

const char* ToCString(const String::Utf8Value& value) {
  return *value ? *value : "<string conversion failed>";
}

int info(char const* fmt, ...)
{
    int res;

    va_list va;
    va_start(va, fmt);
    res = vfprintf(stderr, fmt, va);
    va_end(va);

    return res;
}

void Method(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();

    struct parser pstate;
    struct beatmap map;

    //mods param to string
    v8::String::Utf8Value param(args[1]->ToString());
    std::string paramString = std::string(*param);

    //string to uint32
    uint32_t mods = atoi(paramString.c_str());

    //get score data
    int32_t combo = args[2]->NumberValue();
    uint16_t n100 = args[3]->NumberValue();
    uint16_t n50 = args[4]->NumberValue();
    uint16_t nmiss = args[5]->NumberValue();

    struct diff_calc stars;
    struct pp_calc pp;
    struct pp_params pp_params;
    pp_init(&pp_params);

    //path param to char*
    String::Utf8Value str(args[0]);
    const char* path = ToCString(str);

    p_init(&pstate);
    p_map(&pstate, &map, fopen(path, "r"));

    d_init(&stars);
    d_calc(&stars, &map, mods);

    //required
    pp_params.aim = stars.aim;
    pp_params.speed = stars.speed;

    //optional
    pp_params.mods = mods;
    pp_params.combo = combo;
    pp_params.n100 = n100;
    pp_params.n50 = n50;
    pp_params.nmiss = nmiss;

    //b_ppv2(&map, &pp, stars.aim, stars.speed, mods);
    b_ppv2p(&map, &pp, &pp_params);
    int32_t max_combo = b_max_combo(&map);
    Local<Array> result_list = Array::New(isolate, 2);

    if(max_combo <= 0)
    {
        info("Path: %s\n", path);
        info("Mods: %s\n", std::to_string(mods).c_str());
        info("Combo: %s\n", std::to_string(combo).c_str());
        info("100s: %s\n", std::to_string(n100).c_str());
        info("50s: %s\n", std::to_string(n50).c_str());
        info("Misses: %s\n", std::to_string(nmiss).c_str());
        b_ppv2(&map, &pp, stars.aim, stars.speed, mods);
        info("Base: %s\n", std::to_string(pp.total).c_str());
    }

    result_list->Set(0, Number::New(isolate, pp.total));
    result_list->Set(1, Number::New(isolate, max_combo));

    args.GetReturnValue().Set(result_list);
}

void Initialize(Local<Object> exports) {
  NODE_SET_METHOD(exports, "GetPP", Method);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)

}  // namespace demo