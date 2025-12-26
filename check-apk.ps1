Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('C:\AgenticCommerce\AgenticCommerce-release.apk')
$bundleEntries = $zip.Entries | Where-Object { $_.FullName -like '*bundle*' -or $_.FullName -like '*index*' }
$bundleEntries | Select-Object FullName, Length | Format-Table -AutoSize
$zip.Dispose()
