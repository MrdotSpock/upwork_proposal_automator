require('dotenv').config();
const CaptchaSolver=require('./captcha_solver');

async function main() {
    try {
        console.log('Starting CAPTCHA solver test...');
        const solver=new CaptchaSolver(process.env.OPENAI_API_KEY);

        await solver.solveCaptcha('https://www.upwork.com/ab/account-security/login');

        console.log('CAPTCHA solver test completed');
    } catch(error) {
        console.error('Error in CAPTCHA solver test:',error);
    }
}

main(); 