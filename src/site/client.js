const fs = require("fs");
const path = require('path');
const puppeteer = require('puppeteer');

const {logger} = require('../logging');
const _logger = logger.child({label: 'tsb.org.tr'});


const SITE_BASE_URL = 'https://www.tsb.org.tr';
const SITE_EXCEL_DOWNLOAD_URL = SITE_BASE_URL + 'content/Statistics/';
const SITE_EXCEL_LISTING_PAGE = SITE_BASE_URL + '/tr/istatistik/genel-sigorta-verileri/prim-adet';
const SITE_REPLY_RESPONSE_TIMEOUT = 50_000;

const SITE_PAGE_PATH_LANDING = '/';
const STATICS_COOKIE = "statisticToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmaWxlUGF0aCI6Ii9jb250ZW50L1N0YXRpc3RpY3MvOSBLWksgRmVyZGkgS2F6YSBQcmltIEFkZXQgMjAyNSAwNC54bHN4IiwiZXhwIjoxNzQ5ODE5NzQxLCJpc3MiOiJTYW1wbGUiLCJhdWQiOiJTYW1wbGUifQ.YiIEoW2x7-OOLQqyf2aqioUWsZD9xeEMO0fFJLNdFz0"

/**
 * OpenAI ChatGPT client implementation.
 */
class PuppeteerClient {

    /**
     *
     * @type {puppeteer.Browser}
     */
    browser = null;
    busy = false;
    /**
     *
     * @type {puppeteer.PuppeteerLaunchOptions}
     */
    options = {
        headless: true,
        channel: 'chrome',
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--disable-web-security', '--disable-features=IsolateOrigins', '--disable-site-isolation-trials'],
        slowMo: 20
    }

    constructor(dataDir) {
        const dataDirPath = path.resolve(dataDir);
        if (!fs.existsSync(dataDirPath)) throw new Error(`Given user data directory not found: "${dataDirPath}"`);
        _logger.info(`Found user data directory: "${dataDirPath}"`);

        this.options.userDataDir = dataDirPath;
    }

    /**
     * Returns internal browser state.
     * @returns {boolean}
     */
    get ready() {
        return this.browser && !this.browser.closed && this.browser.connected;
    }

    /**
     * Returns current active page of the browser.
     * @returns {Promise<Page>}
     */
    async currentPage() {
        if (!this.ready) throw new Error(`Browser not initialized.`);
        const pages = await this.browser.pages();
        const page = pages[0];
        const currentUrl = page.url();
        _logger.debug(`Current active page url: ${currentUrl}`);


        _logger.debug(`Navigating to main page: ${SITE_EXCEL_LISTING_PAGE}`);
        await page.goto(SITE_EXCEL_LISTING_PAGE);
        return page;
    }

    async navigateToExcelListing() {
        _logger.debug('Page: Navigating to landing page');

        try {
            const page = await this.currentPage();
            await page.goto(SITE_EXCEL_LISTING_PAGE);
            _logger.debug('Navigated to base url.');
        } catch (e) {
            _logger.warn(`Error while navigating to base url. ${e.message}`);
            _logger.info(`Performing hard navigation: ${SITE_BASE_URL}`);
        }
    }

    async init() {
        _logger.debug('Browser: initialization started');
        if (this.ready) {
            _logger.info('Browser: already initialized');
            return;
        }
        this.browser = await puppeteer.launch(this.options);
        _logger.info('Browser: initialized');
        _logger.debug('Browser: initialization finished');
    }

    async close() {
        _logger.debug('Browser: closing started');
        if (!this.ready) {
            _logger.info('Browser already closed');
        }
        await this.browser.close();
        _logger.info('Browser: closed');
        _logger.debug('Browser: closing finished');
    }

    async downloadProxy(filename, year, month) {

        return this._executionContext(async () => {
            await this.navigateToExcelListing();
            const page = await this.currentPage();
            _logger.debug(`Downloading: ${filename}`);

            const items = await page.evaluate(async (url) => {
                    const response = await fetch(url);
                    return response.json();
                },
                `https://www.tsb.org.tr/Statistic/GetStatistics?pageId=1&periodYear=${year}&statisticPeriodId=&periodMonth=${month}&statisticCategoryId=1&statisticSubCategoryId=1`
            );
            const selected = items.Result.find(s => s.FileName === filename);
            const fileUrl = SITE_BASE_URL + selected.FilePath;

            const base64Data = await page.evaluate(async (url, staticsId, fileUrl) => {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Accept": 'application/json',
                    },
                    credentials: 'include',
                    body: new URLSearchParams({ statisticId: staticsId }),
                });
                const body = await response.json();
                const fileResponse = await fetch(fileUrl);
                const blob = await fileResponse.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            }, `https://www.tsb.org.tr/Statistic/ControlRememberMe`, selected.Id, fileUrl);
            const buffer = Buffer.from(base64Data, 'base64');
            const res = filename + ".xlsx";
            fs.writeFileSync(res, buffer);
            _logger.debug(`Downloaded: ${SITE_EXCEL_DOWNLOAD_URL + filename}`);
            return res;
        });
    }


    _executionContext(handler) {
        if (this.busy) throw new Error('Browser is busy!');
        this.busy = true;

        try {
            return handler();
        } catch (e) {
            throw e;
        } finally {
            this.busy = false;
        }
    }
}

const randomPoint = ({x, y, width, height}) => {
    const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
    return {x: x + rnd(width * 0.1, width * 0.9), y: y + rnd(height * 0.1, height * 0.9)}
}

module.exports = {
    ChatOpenaiClient: PuppeteerClient
}
