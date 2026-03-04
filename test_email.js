require('dotenv').config();
const { sendPdfEmail } = require('./server/services/emailService');

async function test() {
    try {
        console.log('Sending email...');
        const res = await sendPdfEmail('rajputrituraj03@gmail.com', './package.json', 'test.pdf');
        console.log('Success:', res);
    } catch (err) {
        console.error('Error:', err);
    }
}
test();
