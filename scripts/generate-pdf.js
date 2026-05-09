const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const lang = args.find(a => a.startsWith('--lang='))?.split('=')[1] || 'en';
const job = args.find(a => a.startsWith('--job='))?.split('=')[1] || '';

async function generatePDF() {
    console.log(`Generating PDF for lang: ${lang}${job ? `, job: ${job}` : ''}...`);

    // 1. Start Vite dev server
    const vite = spawn('npx', ['vite', '--port', '3000', '--strictPort'], {
        shell: true,
        stdio: 'pipe'
    });

    let url = 'http://localhost:3000';
    
    // Wait for Vite to start
    await new Promise((resolve) => {
        vite.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[Vite]: ${output.trim()}`);
            if (output.includes('Local:') || output.includes('ready in')) {
                resolve();
            }
        });
        // Timeout after 10s
        setTimeout(resolve, 10000);
    });

    const targetUrl = `${url}?lang=${lang}${job ? `&job=${job}` : ''}`;
    console.log(`Navigating to: ${targetUrl}`);

    // 2. Launch Puppeteer
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    await page.goto(targetUrl, { waitUntil: 'networkidle0' });

    // Wait a bit for the JS to render everything
    await new Promise(r => setTimeout(r, 1000));

    // 3. Save PDF
    const filename = `cv-${lang}${job ? `-${job}` : ''}.pdf`;
    const outputPath = path.join(__dirname, '../output', filename);

    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    console.log(`PDF saved to: ${outputPath}`);

    // 4. Cleanup
    await browser.close();
    vite.kill();
    process.exit(0);
}

generatePDF().catch(err => {
    console.error(err);
    process.exit(1);
});
