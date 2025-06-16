const { Command } = require('commander');

const program = new Command();
program
  .name('bot-gpt-init')
  .description('Command Line Interface for creating new browser context.')
  .option('-d, --data-dir <dataDir>', 'user data directory')
  .version('1.0.0');

program.parse();
const options = program.opts();

if (!options.dataDir) {
  process.exit();
}

const puppeteer = require('puppeteer');
puppeteer.launch({
  headless: false,
  channel: 'chrome',
  userDataDir: options.dataDir,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--disable-features=IsolateOrigins',
    '--disable-site-isolation-trials'
  ],
});
