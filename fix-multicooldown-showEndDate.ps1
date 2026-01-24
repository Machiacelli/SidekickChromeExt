$filePath = "src\modules\timer.module.js"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Remove the showEndDate variable from multi-cooldown section (around line 2229)
$content = $content -replace "const showEndDate = timer\.showEndDate !== undefined \? timer\.showEndDate : false;`r?`n\s+", ""

# Remove cursor: pointer from multi-cooldown divs since we removed the click handler
$content = $content -replace "cursor: pointer;`r?`n\s+", ""

Set-Content -Path $filePath -Value $content -NoNewline -Encoding UTF8
Write-Host "✅ Successfully removed showEndDate from multi-cooldown section!"
Write-Host "End dates will now always show for multi-cooldown timers."
