$filePath = "src\modules\timer.module.js"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Read the file line by line to find the exact location
$lines = $content -split "`r?`n"
$startLine = -1

# Find the line with "Ends at: ${endTimeData.time}" that's in the multi-cooldown section
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'Ends at:.*endTimeData\.time' -and $i -gt 2000) {
        # Check if this is in the multi-cooldown section (not the single timer one)
        # Look backwards for "cooldownDiv"
        $foundCooldownDiv = $false
        for ($j = $i; $j -gt [Math]::Max(0, $i - 50); $j--) {
            if ($lines[$j] -match 'cooldownDiv\.innerHTML') {
                $foundCooldownDiv = $true
                break
            }
        }
        
        if ($foundCooldownDiv) {
            $startLine = $i
            Write-Host "Found multi-cooldown 'Ends at' on line $($i + 1)"
            break
        }
    }
}

if ($startLine -ge 0) {
    # We need to wrap lines $startLine-6 through $startLine+5 in a conditional
    # Line $startLine-6 is the closing of formatTime span
    # Lines $startLine-5 through $startLine are the first end date span
    # Lines $startLine+1 through $startLine+5 are the second end date span
    
    $beforeLine = $startLine - 6  # The line with formatTime closing
    $afterLine = $startLine + 5   # The line with endTimeData.date closing
    
    Write-Host "Modifying lines $($beforeLine + 1) through $($afterLine + 1)"
    
    # Get the original formatTime line
    $formatTimeLine = $lines[$beforeLine]
    
    # Create the new conditional block
    $newLines = @()
    $newLines += $formatTimeLine
    $newLines += "                                `${showEndDate ? ``<span style=`""
    
    # Add the first span (Ends at)
    for ($i = $beforeLine + 1; $i -le $startLine; $i++) {
        $newLines += $lines[$i]
    }
    
    # Add the second span (date)
    for ($i = $startLine + 1; $i -le $afterLine; $i++) {
        $newLines += $lines[$i]
    }
    
    $newLines += "                                `` : ''}"
    
    # Rebuild the file
    $newContent = @()
    for ($i = 0; $i -lt $beforeLine; $i++) {
        $newContent += $lines[$i]
    }
    $newContent += $newLines
    for ($i = $afterLine + 1; $i -lt $lines.Count; $i++) {
        $newContent += $lines[$i]
    }
    
    $finalContent = $newContent -join "`n"
    Set-Content -Path $filePath -Value $finalContent -NoNewline -Encoding UTF8
    Write-Host "✅ Successfully updated multi-cooldown end date display!"
}
else {
    Write-Host "❌ Could not find the multi-cooldown 'Ends at' line"
}
