const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔍 Discord Bot Command Diagnostic Tool\n');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

function loadCommands(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            loadCommands(itemPath);
        } else if (item.endsWith('.js')) {
            try {
                const command = require(itemPath);
                if ('data' in command) {
                    const jsonData = command.data.toJSON();
                    commands.push({
                        name: jsonData.name,
                        path: itemPath,
                        size: JSON.stringify(jsonData).length,
                        data: jsonData
                    });
                }
            } catch (error) {
                console.error(`❌ Error loading ${item}:`, error.message);
            }
        }
    }
}

console.log('📂 Loading commands...\n');
loadCommands(commandsPath);

console.log(`✅ Loaded ${commands.length} commands\n`);

// Check for issues
console.log('🔍 Checking for potential issues...\n');

let hasIssues = false;

// 1. Check total size
const totalSize = commands.reduce((sum, cmd) => sum + cmd.size, 0);
console.log(`📊 Total payload size: ${totalSize.toLocaleString()} bytes`);
if (totalSize > 1000000) { // 1MB
    console.log('⚠️  WARNING: Total size is very large (>1MB)');
    hasIssues = true;
}
console.log('');

// 2. Check individual command sizes
console.log('📋 Command sizes:');
const sortedBySize = [...commands].sort((a, b) => b.size - a.size);
sortedBySize.forEach((cmd, index) => {
    const sizeKB = (cmd.size / 1024).toFixed(2);
    const icon = cmd.size > 5000 ? '⚠️ ' : cmd.size > 3000 ? '⚠️  ' : '✅';
    console.log(`   ${icon} ${(index + 1).toString().padStart(2)}. /${cmd.name.padEnd(20)} ${sizeKB.padStart(6)} KB`);
    if (cmd.size > 5000) {
        hasIssues = true;
    }
});
console.log('');

// 3. Check for problematic commands
console.log('🔍 Checking command structure...');
commands.forEach(cmd => {
    // Check name
    if (!cmd.data.name || cmd.data.name.length === 0) {
        console.log(`❌ ${cmd.path}: Missing name`);
        hasIssues = true;
    }
    
    // Check description
    if (!cmd.data.description || cmd.data.description.length === 0) {
        console.log(`❌ ${cmd.path}: Missing description`);
        hasIssues = true;
    }
    
    // Check for excessively nested options
    if (cmd.data.options) {
        const optionsDepth = JSON.stringify(cmd.data.options).split('{').length - 1;
        if (optionsDepth > 50) {
            console.log(`⚠️  ${cmd.data.name}: Very complex options (depth: ${optionsDepth})`);
            hasIssues = true;
        }
    }
});

if (!hasIssues) {
    console.log('✅ No structural issues found');
}
console.log('');

// 4. Token check
console.log('🔐 Checking configuration...');
if (!process.env.DISCORD_TOKEN) {
    console.log('❌ DISCORD_TOKEN not found in .env');
    hasIssues = true;
} else {
    try {
        const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString();
        console.log(`✅ Discord Token: Valid format`);
        console.log(`   Client ID: ${clientId}`);
    } catch (error) {
        console.log('❌ Discord Token: Invalid format');
        hasIssues = true;
    }
}
console.log('');

// 5. Command name conflicts
console.log('🔍 Checking for duplicate command names...');
const nameMap = new Map();
commands.forEach(cmd => {
    if (nameMap.has(cmd.data.name)) {
        console.log(`❌ Duplicate command name: ${cmd.data.name}`);
        console.log(`   ${nameMap.get(cmd.data.name)}`);
        console.log(`   ${cmd.path}`);
        hasIssues = true;
    } else {
        nameMap.set(cmd.data.name, cmd.path);
    }
});
if (!hasIssues) {
    console.log('✅ No duplicate names found');
}
console.log('');

// Summary
console.log('═══════════════════════════════════════════');
if (hasIssues) {
    console.log('⚠️  ISSUES DETECTED - Review warnings above');
    console.log('');
    console.log('💡 Recommendations:');
    console.log('   1. Try guild deployment instead:');
    console.log('      node deploy-commands.js --guild YOUR_GUILD_ID');
    console.log('   2. If a specific command is too large, simplify it');
    console.log('   3. Check Discord API status: https://discordstatus.com');
} else {
    console.log('✅ ALL CHECKS PASSED');
    console.log('');
    console.log('💡 If deployment still fails:');
    console.log('   1. Try guild deployment first (faster):');
    console.log('      node deploy-commands.js --guild YOUR_GUILD_ID');
    console.log('   2. Check your internet connection');
    console.log('   3. Wait a few minutes and try again');
    console.log('   4. Check Discord API status: https://discordstatus.com');
}
console.log('═══════════════════════════════════════════\n');

// Export data for further analysis if needed
if (process.argv.includes('--json')) {
    const output = {
        totalCommands: commands.length,
        totalSize: totalSize,
        commands: commands.map(cmd => ({
            name: cmd.name,
            size: cmd.size,
            path: cmd.path
        }))
    };
    console.log('\n📄 JSON Output:');
    console.log(JSON.stringify(output, null, 2));
}
