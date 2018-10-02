#define OPPAI_IMPLEMENTATION
#include <nan.h>
#include <errno.h>
#include <string>
#include "./oppai.c"

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

FILE* GetMapFile(LPCWSTR path, const FunctionCallbackInfo<Value>& args)
{
    errno = 0;
    FILE * mapFile;
    mapFile = _wfopen(path, L"r");

    if(mapFile==NULL)
    {
        //try with fopen
        String::Utf8Value str(args[0]);
        const char* pathNarrow = ToCString(str);

        errno = 0;
        mapFile = fopen(pathNarrow, "r");
    }

    if(mapFile==NULL)
    {
        info("Failed to open file, error: %s\n", std::to_string(errno).c_str());
        return NULL;
    } else
    {
        return mapFile;
    }
}

Local<Array> CreateResultList(Isolate* isolate, double = 0, int32_t = 0, double = 0);

Local<Array> CreateResultList(Isolate* isolate, double pp_total, int32_t max_combo, double pp_max_total)
{
    Local<Array> result_list;

    if(max_combo == 0)
    {
        result_list = Array::New(isolate, 0);
    } else
    {
        result_list = Array::New(isolate, 3);

        result_list->Set(0, Number::New(isolate, pp_total));
        result_list->Set(1, Number::New(isolate, max_combo));
        result_list->Set(2, Number::New(isolate, pp_max_total));
    }

    return result_list;
}

Local<Array> CalcStandardPP(const FunctionCallbackInfo<Value>& args, uint32_t mods, Isolate* isolate)
{
    //path param to char*
    LPCWSTR path = (LPCWSTR) * String::Value(args[0]->ToString());

    FILE * mapFile = GetMapFile(path, args);

    if(mapFile == NULL)
    {
        return CreateResultList(isolate);
    } else
    {
        struct parser pstate;
        struct beatmap map;

        p_init(&pstate);
        p_map(&pstate, &map, mapFile);

        struct diff_calc stars;

        d_init(&stars);
        d_calc(&stars, &map, mods);

        struct pp_params pp_params;
        pp_init(&pp_params);

        //required
        pp_params.aim = stars.aim;
        pp_params.speed = stars.speed;

        //get score data
        int32_t combo = static_cast<int32_t>(args[2]->NumberValue());
        uint16_t n100 = static_cast<uint16_t>(args[3]->NumberValue());
        uint16_t n50 = static_cast<uint16_t>(args[4]->NumberValue());
        uint16_t nmiss = static_cast<uint16_t>(args[5]->NumberValue());

        //optional
        pp_params.mods = mods;
        pp_params.combo = combo;
        pp_params.n100 = n100;
        pp_params.n50 = n50;
        pp_params.nmiss = nmiss;

        struct pp_calc pp;
        struct pp_calc pp_max;

        b_ppv2p(&map, &pp, &pp_params);
        b_ppv2(&map, &pp_max, stars.aim, stars.speed, mods);
        int32_t max_combo = b_max_combo(&map);

        fclose(mapFile);

        return CreateResultList(isolate, pp.total, max_combo, pp_max.total);
    }
}

Local<Array> CalcTaikoPP(const FunctionCallbackInfo<Value>& args, uint32_t mods, Isolate* isolate)
{
    uint16_t n100 = static_cast<uint16_t>(args[3]->NumberValue());
    uint16_t nmiss = static_cast<uint16_t>(args[5]->NumberValue());
    double stars = args[7]->NumberValue();
    int32_t max_combo = static_cast<int32_t>(args[8]->NumberValue());
    float base_od = static_cast<float>(args[9]->NumberValue());

    struct pp_calc pp;
    struct pp_calc pp_max;

    taiko_ppv2x(&pp, stars, max_combo, base_od, n100, nmiss, mods);
    taiko_ppv2(&pp_max, stars, max_combo, base_od, mods);

    return CreateResultList(isolate, pp.total, max_combo, pp_max.total);
}

void Method(const FunctionCallbackInfo<Value>& args) {
    //mods param to string
    v8::String::Utf8Value param(args[1]->ToString());
    std::string paramString = std::string(*param);

    uint32_t mode = static_cast<uint32_t> (args[6]->NumberValue());
    uint32_t mods = atoi(paramString.c_str());

    Local<Array> result_list;
    Isolate* isolate = args.GetIsolate();

    if(mode == 0)
    {
        result_list = CalcStandardPP(args, mods, isolate);
    } else
    {
        result_list = CalcTaikoPP(args, mods, isolate);
    }

    if(result_list->Length() == 0)
    {
        args.GetReturnValue().Set(args[0]);
    }

    args.GetReturnValue().Set(result_list);
}

void Initialize(Local<Object> exports) {
  NODE_SET_METHOD(exports, "GetPP", Method);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, Initialize)

}  // namespace demo