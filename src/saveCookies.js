const puppeteer = require('puppeteer');
const fs = require('fs').promises; //for working with files


(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        channel: 'chrome',
        userDataDir: "user_data",
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--disable-web-security', '--disable-features=IsolateOrigins', '--disable-site-isolation-trials'],
    });
    const page = await browser.newPage();
    await page.goto('https://tsb.org.tr/tr/istatistik/genel-sigorta-verileri/prim-adet');
    const cookies = await browser.cookies();
    console.log(cookies, 'cookies');
    const cookieJson = JSON.stringify(cookies, null, 2);
    await fs.writeFile('cookies.json', cookieJson);//save cookie
    await browser.close();
})();