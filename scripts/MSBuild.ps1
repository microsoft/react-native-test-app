param(
    [Parameter(Mandatory, Position=0)]
    [String]
    $ProjectFile,

    [String]
    $Configuration="Debug",

    [String]
    $Platform="x64",

    [String]
    $Target="Rebuild"
)

MSBuild `
    -maxCpuCount `
    -property:Configuration=$Configuration `
    -property:Platform=$Platform `
    -property:AppxPackageSigningEnabled=false `
    -property:UseBundle=false `
    -target:$Target `
    $ProjectFile
