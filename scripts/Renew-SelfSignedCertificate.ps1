param([Switch]$Verbose=$False)

$ErrorActionPreference = "Stop"

$ReactTestApp_Project_Path = "windows\ReactTestApp\ReactTestApp.vcxproj"
$ReactTestApp_Test_Cert_Path = "windows\ReactTestApp\ReactTestApp_TemporaryKey.pfx"

# Set .NET current directory to PowerShell's
[Environment]::CurrentDirectory = (Get-Location -PSProvider FileSystem).ProviderPath

# Read the current certificate
if ($Verbose) {
    Write-Host "Reading $ReactTestApp_Test_Cert_Path..."
}
$Current_Cert = Get-PfxCertificate -FilePath $ReactTestApp_Test_Cert_Path
if ($Verbose) {
    $Current_Cert | Select-Object SerialNumber,Issuer,NotAfter,NotBefore,Subject,EnhancedKeyUsageList,Extensions,PrivateKey,PublicKey,Thumbprint
}

# Create a new certificate using properties from the current certificate
# https://docs.microsoft.com/en-us/windows/msix/package/create-certificate-package-signing
# https://sitecore.stackexchange.com/questions/9419/certificate-does-not-contain-private-key-exception-while-executing-sitecore-9-in
if ($Verbose) {
    Write-Host "Generating new self-signed certificate..."
    Write-Host ""
}
$New_Cert = New-SelfSignedCertificate `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}") `
    -KeyUsage DigitalSignature `
    -Provider "Microsoft Strong Cryptographic Provider" `
    -KeySpec Signature `
    -Type Custom `
    -FriendlyName "ReactTestApp Development Certificate" `
    -Subject $Current_Cert.Subject `
    -CertStoreLocation "Cert:\CurrentUser\My"
if ($Verbose) {
    $New_Cert | Select-Object SerialNumber,Issuer,NotAfter,NotBefore,Subject,EnhancedKeyUsageList,Extensions,PrivateKey,PublicKey,Thumbprint
}
$Cert_Data = $New_Cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pfx)
[System.IO.File]::WriteAllBytes($ReactTestApp_Test_Cert_Path, $Cert_Data)

# Update the certificate thumbprint in the project
if ($Verbose) {
    Write-Host "Updating $ReactTestApp_Project_Path..."
}
$Project = [System.IO.File]::ReadAllText($ReactTestApp_Project_Path)
$Updated_Project = $Project.replace($Current_Cert.Thumbprint, $New_Cert.Thumbprint)
Set-Content -Path $ReactTestApp_Project_Path -Value $Updated_Project -NoNewline
