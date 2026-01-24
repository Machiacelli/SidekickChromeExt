$filePath = "src\modules\timer.module.js"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Fix 1: Remove the showEndDate variable declaration (line 1632)
$content = $content -replace "const showEndDate = timer\.showEndDate !== undefined \? timer\.showEndDate : false;`r?`n\s+", ""

# Fix 2: Change the conditional from "endTimeData && showEndDate" to just "endTimeData"
$content = $content -replace '\$\{endTimeData && showEndDate \?', '${endTimeData ?'

Set-Content -Path $filePath -Value $content -NoNewline -Encoding UTF8
Write-Host "✅ Successfully removed showEndDate conditional!"
Write-Host "End dates will now always show for all timers."
