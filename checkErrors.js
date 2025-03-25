const { exec } = require('child_process');

// Run tsc on specific files to check for errors
exec('npx tsc src/plugin/code.ts src/plugin/designSystemLoader.ts --noEmit', (error, stdout, stderr) => {
  if (error) {
    console.error(`Execution error: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`Error: ${stderr}`);
    return;
  }
  console.log(`Output: ${stdout}`);
}); 