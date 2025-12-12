#pragma once

#include <any>
#include <map>
#include <string_view>
#include <vector>

#include <winrt/Microsoft.ReactNative.h>
#include <winrt/base.h>

#include "Manifest.h"

namespace ReactApp
{
    void JSValueWriterWriteValue(winrt::Microsoft::ReactNative::IJSValueWriter const &writer,
                                 std::any const &value)
    {
        if (value.type() == typeid(bool)) {
            writer.WriteBoolean(std::any_cast<bool>(value));
        } else if (value.type() == typeid(std::int64_t)) {
            writer.WriteInt64(std::any_cast<std::int64_t>(value));
        } else if (value.type() == typeid(double)) {
            writer.WriteDouble(std::any_cast<double>(value));
        } else if (value.type() == typeid(std::string_view)) {
            writer.WriteString(winrt::to_hstring(std::any_cast<std::string_view>(value)));
        } else if (value.type() == typeid(std::vector<std::any>)) {
            writer.WriteArrayBegin();
            for (auto &&entry : std::any_cast<std::vector<std::any>>(value)) {
                JSValueWriterWriteValue(writer, entry);
            }
            writer.WriteArrayEnd();
        } else if (value.type() == typeid(JSONObject)) {
            writer.WriteObjectBegin();
            for (auto &[key, val] : std::any_cast<JSONObject>(value)) {
                writer.WritePropertyName(winrt::to_hstring(key));
                JSValueWriterWriteValue(writer, val);
            }
            writer.WriteObjectEnd();
        } else {
            writer.WriteNull();
        }
    }
}  // namespace ReactApp
