$ErrorActionPreference = 'Stop'
$dialog = $null
$result = @{ status = 'complete'; path = $null }

try {
    Add-Type -AssemblyName System.Windows.Forms
    $formsAssembly = [System.Windows.Forms.Form].Assembly.Location
    Add-Type -ReferencedAssemblies $formsAssembly -TypeDefinition @'
using System;
using System.Windows.Forms;

public sealed class FolderPickerOwner : IWin32Window
{
    public IntPtr Handle { get; private set; }

    public FolderPickerOwner(IntPtr handle)
    {
        Handle = handle;
    }
}
'@
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = 'Select the 7 Days to Die installation folder'
    $dialog.ShowNewFolderButton = $false
    if (Test-Path -LiteralPath $env:SEVEN_DAYS_TO_DIE_INITIAL_PATH -PathType Container) {
        [void]($dialog.SelectedPath = $env:SEVEN_DAYS_TO_DIE_INITIAL_PATH)
    }
    $owner = [FolderPickerOwner]::new([IntPtr]::new([long]$env:SEVEN_DAYS_TO_DIE_OWNER_HANDLE))
    if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {
        $result.path = $dialog.SelectedPath
    }
}
catch {
    $result.status = 'error'
    $result.message = $_.ToString()
}
finally {
    if ($null -ne $dialog) {
        $dialog.Dispose()
    }
    $json = ConvertTo-Json -InputObject $result -Compress
    [System.IO.File]::WriteAllText(
        $env:SEVEN_DAYS_TO_DIE_RESULT_PATH,
        $json,
        [System.Text.UTF8Encoding]::new($false)
    )
}
