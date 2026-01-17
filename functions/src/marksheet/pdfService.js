const puppeteer = require('puppeteer');

/**
 * Converts HTML to PDF buffer using Puppeteer
 * @param {string} html - HTML content to convert
 * @returns {Promise<Buffer>} PDF buffer
 */
exports.htmlToPdf = async (html) => {
  let browser;
  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      // Use a smaller viewport to reduce memory usage
      defaultViewport: { 
        width: 1200, 
        height: 800 
      }
    });

    // Create a new page
    const page = await browser.newPage();

    // Set content to the HTML
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate PDF with A4 format
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      preferCSSPageSize: false
    });

    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  } finally {
    // Close browser to free resources
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Validates HTML content for PDF generation
 * @param {string} html - HTML content to validate
 * @returns {boolean} True if valid, false otherwise
 */
exports.validateHtmlForPdf = (html) => {
  if (!html || typeof html !== 'string') {
    return false;
  }

  // Basic validation checks
  if (!html.includes('<!DOCTYPE html>') && !html.includes('<html>')) {
    return false;
  }

  if (!html.includes('<body>')) {
    return false;
  }

  return true;
};