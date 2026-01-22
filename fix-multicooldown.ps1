$filePath = "src\modules\timer.module.js"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Replace the two end date spans with a conditional wrapper
# We need to find the exact pattern and wrap it
$oldText = @'
                                <span style="
                                    color: #aaa;
                                    font-size: 11px;
                                    font-family: 'Courier New', monospace;
                                    line-height: 1.3;
                                ">Ends at: ${endTimeData.time}</span>
                                <span style="
                                    color: #999;
                                    font-size: 10px;
                                    line-height: 1.3;
                                ">${endTimeData.date}</span>
'@

$newText = @'
${showEndDate ? `<span style="
                                    color: #aaa;
                                    font-size: 11px;
                                    font-family: 'Courier New', monospace;
                                    line-height: 1.3;
                                ">Ends at: ${endTimeData.time}</span>
                                <span style="
                                    color: #999;
                                    font-size: 10px;
                                    line-height: 1.3;
                                ">${endTimeData.date}</span>` : ''}
'@

# Count occurrences
$pattern = [regex]::Escape($oldText)
$matches = [regex]::Matches($content, $pattern)
Write-Host "Found $($matches.Count) occurrences of the pattern"

if ($matches.Count -gt 0) {
    # Replace only in the multi-cooldown section (after line 2200)
    $lines = $content -split "`r?`n"
    $found = $false
    
    for ($i = 2200; $i -lt $lines.Count - 10; $i++) {
        if ($lines[$i] -match 'Ends at:.*endTimeData\.time' -and $lines[$i] -match 'span') {
            # Check if this is in cooldownDiv section
            $inCooldownDiv = $false
            for ($j = $i; $j -gt [Math]::Max(0, $i - 30); $j--) {
                if ($lines[$j] -match 'cooldownDiv\.innerHTML') {
                    $inCooldownDiv = $true
                    break
                }
            }
            
            if ($inCooldownDiv) {
                Write-Host "Found multi-cooldown end date pattern starting at line $($i + 1)"
                # Replace just this section
                $beforeSection = $lines[0..($i - 2)] -join "`n"
                $afterSection = $lines[($i + 6)..($lines.Count - 1)] -join "`n"
                
                $newContent = $beforeSection + "`n" + $newText + $afterSection
                Set-Content -Path $filePath -Value $newContent -NoNewline -Encoding UTF8
                Write-Host "✅ Successfully updated!"
                $found = $true
                break
            }
        }
    }
    
    if (-not $found) {
        Write-Host "❌ Could not find the multi-cooldown section"
    }
}
else {
    Write-Host "❌ Pattern not found in file"
}
