$ErrorActionPreference = "Stop"

$path = vswhere -latest -products * -requires Microsoft.VisualStudio.Workload.ManagedDesktop Microsoft.VisualStudio.Workload.Web -requiresAny -property installationPath
$path = join-path $path "Common7\IDE\CommonExtensions\Microsoft\TestWindow\VSTest.Console.exe"
& $path $args
