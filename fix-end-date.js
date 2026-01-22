const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'modules', 'timer.module.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the hardcoded end date spans with conditional ones
const oldPattern = `                                ">\${this.formatTime(time)}</span>
                                <span style="
                                    color: #aaa;
                                    font-size: 11px;
                                    font-family: 'Courier New', monospace;
                                    line-height: 1.3;
                                ">Ends at: \${endTimeData.time}</span>
                                <span style="
                                    color: #999;
                                    font-size: 10px;
                                    line-height: 1.3;
                                ">\${endTimeData.date}</span>`;

const newPattern = `">\${this.formatTime(time)}</span>
                                \${showEndDate ? \`<span style="
                                    color: #aaa;
                                    font-size: 11px;
                                    font-family: 'Courier New', monospace;
                                    line-height: 1.3;
                                ">Ends at: \${endTimeData.time}</span>
                                <span style="
                                    color: #999;
                                    font-size: 10px;
                                    line-height: 1.3;
                                ">\${endTimeData.date}</span>\` : ''}`;

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Successfully updated multi-cooldown end date display!');
    console.log('End dates are now conditional on showEndDate flag.');
} else {
    console.log('❌ Pattern not found. The file may have already been updated or the pattern has changed.');
    console.log('Searching for similar patterns...');

    // Try to find the line
    const lines = content.split('\n');
    const lineIndex = lines.findIndex(line => line.includes('Ends at: ${endTimeData.time}'));
    if (lineIndex !== -1) {
        console.log(`Found "Ends at" on line ${lineIndex + 1}`);
        console.log('Context:');
        for (let i = Math.max(0, lineIndex - 3); i < Math.min(lines.length, lineIndex + 8); i++) {
            console.log(`${i + 1}: ${lines[i]}`);
        }
    }
}
