#pragma once

#include <any>
#include <map>
#include <string>
#include <vector>

#include <winrt/Microsoft.ReactNative.h>
#include <winrt/base.h>

namespace ReactApp
{
    void JSValueWriterWriteValue(winrt::Microsoft::ReactNative::IJSValueWriter const &writer,
                                 std::any const &value)
    {
        if (value.type() == typeid(bool)) {
            writer.WriteBoolean(std::any_cast<bool>(value));
        } else if (value.type() == typeid(std::int64_t)) {
            writer.WriteInt64(std::any_cast<std::int64_t>(value));
        } else if (value.type() == typeid(std::uint64_t)) {
            writer.WriteInt64(std::any_cast<std::uint64_t>(value));
        } else if (value.type() == typeid(double)) {
            writer.WriteDouble(std::any_cast<double>(value));
        } else if (value.type() == typeid(std::nullopt)) {
            writer.WriteNull();
        } else if (value.type() == typeid(std::string)) {
            writer.WriteString(winrt::to_hstring(std::any_cast<std::string>(value)));
        } else if (value.type() == typeid(std::vector<std::any>)) {
            writer.WriteArrayBegin();
            for (auto &&entry : std::any_cast<std::vector<std::any>>(value)) {
                JSValueWriterWriteValue(writer, entry);
            }
            writer.WriteArrayEnd();
        } else if (value.type() == typeid(std::map<std::string, std::any>)) {
            writer.WriteObjectBegin();
            for (auto &[key, val] : std::any_cast<std::map<std::string, std::any>>(value)) {
                writer.WritePropertyName(winrt::to_hstring(key));
                JSValueWriterWriteValue(writer, val);
            }
            writer.WriteObjectEnd();
        } else {
            assert(false);
        }
    }
}  // namespace ReactApp
