// Configure environment variables


const {Command} = require('commander');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const {ChatOpenaiClient} = require("./site/client");

const {logger} = require("./logging");
const _logger = logger.child({label: 'server'});

const program = new Command();
program
  .name('bot-gpt-server')
  .description('Server implementation for botGptClient.')
  .option('-d, --data-dir <dataDir>', 'user data directory')
  .option('-h, --hostname <hostname>', 'http server listen hostname', '0.0.0.0')
  .option('-p, --port <port>', 'http server listen port', '8766')
  .version('1.0.0');

program.parse();
const options = program.opts();

if (!options.dataDir) {
    process.exit();
}

const client = new ChatOpenaiClient(options.dataDir);

const app = express();
_logger.debug('Server: initialized');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

app.get('/download', async function (req, res) {
    const file = req.query.file;
    const year = req.query.year;
    const month = req.query.month;
    _logger.info(file, 'file');
    _logger.info('Received: GET /download');

    try {
        const response = await client.downloadProxy(file, year, month);
        _logger.debug(`Response: ${response}`);
        res.sendFile(response, { root: __dirname + '/..' });
    } catch (e) {
        res.end(JSON.stringify({error: true, message: e.message}));
    }
});


const server = app.listen(parseInt(options.port), options.hostname, async () => {
    _logger.info(`Server: started`);
    _logger.info(`Server: Listening connections from http://${options.hostname}:${options.port}`);

    await client.init();
});

const signalHandler = () => {
    server.close(async () => {
        _logger.info('Server: Gracefully closed');
        await client.close();
        process.exit(0);
    });

    // Force close the server after 5 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 5000);
}

process.on('SIGINT', signalHandler);
process.on('SIGTERM', signalHandler);
