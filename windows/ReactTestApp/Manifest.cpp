#include "pch.h"
#include "Manifest.h"
#include "fstream"
#include "iostream"

using namespace std;

namespace winrt::ReactTestApp::implementation {

    Manifest ManifestProvider::getManifest()
    {
        ifstream manifestFile("app.json");
        json j;
        manifestFile >> j;
        cout << j;
        auto m = j.get<Manifest>();
        return m;
    }
}  // namespace winrt::ReactTestApp::implementation
