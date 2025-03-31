const puppeteer=require('puppeteer');
const OpenAI=require('openai');
const {spawn}=require('child_process');

class CaptchaSolver {
    constructor(apiKey) {
        this.openai=new OpenAI({apiKey});
        this.xvfbProcess=null;
        this.display=':99';
    }

    async startVirtualDisplay() {
        return new Promise((resolve,reject) => {
            console.log('Starting Xvfb...');
            this.xvfbProcess=spawn('Xvfb',[
                this.display,
                '-screen','0','1024x768x24',
                '-ac'
            ]);

            this.xvfbProcess.stdout.on('data',(data) => {
                console.log(`Xvfb stdout: ${data}`);
            });

            this.xvfbProcess.stderr.on('data',(data) => {
                console.log(`Xvfb stderr: ${data}`);
            });

            // Give Xvfb a moment to start
            setTimeout(() => {
                process.env.DISPLAY=this.display;
                resolve();
            },1000);
        });
    }

    async stopVirtualDisplay() {
        if(this.xvfbProcess) {
            console.log('Stopping Xvfb...');
            this.xvfbProcess.kill();
            this.xvfbProcess=null;
        }
    }

    async handleComputerAction(page,action) {
        console.log('Handling computer action:',action);
        try {
            switch(action.type) {
                case "click": {
                    const {x,y}=action;
                    await page.mouse.click(x,y);
                    break;
                }
                case "move": {
                    const {x,y}=action;
                    await page.mouse.move(x,y);
                    break;
                }
                case "scroll": {
                    const {x,y,scrollX,scrollY}=action;
                    await page.mouse.move(x,y);
                    await page.evaluate(`window.scrollBy(${scrollX}, ${scrollY})`);
                    break;
                }
                case "wait": {
                    await new Promise(resolve => setTimeout(resolve,2000));
                    break;
                }
                default:
                    console.log("Unhandled action type:",action.type);
            }
        } catch(error) {
            console.error('Error handling computer action:',error);
            throw error;
        }
    }

    async computerUseLoop(page,response) {
        while(true) {
            const computerCalls=response.output.filter(
                item => item.type==="computer_call"
            );

            if(computerCalls.length===0) {
                const messages=response.output.filter(
                    item => item.type==="message"
                );
                if(messages.length>0) {
                    console.log('AI Message:',messages[0].content);
                }
                break;
            }

            for(const call of computerCalls) {
                await this.handleComputerAction(page,call.action);
                await page.screenshot({path: `screenshot_action_${Date.now()}.png`});
            }

            const screenshot=await page.screenshot();
            const screenshotBase64=screenshot.toString('base64');

            response=await this.openai.responses.create({
                model: "computer-use-preview",
                previous_response_id: response.id,
                tools: [{
                    type: "computer_use_preview",
                    display_width: 1024,
                    display_height: 768,
                    environment: "browser"
                }],
                input: [{
                    call_id: computerCalls[computerCalls.length-1].call_id,
                    type: "computer_call_output",
                    output: {
                        type: "input_image",
                        image_url: `data:image/png;base64,${screenshotBase64}`
                    },
                    current_url: await page.url()
                }],
                truncation: "auto"
            });
        }
        return response;
    }

    async solveCaptcha(url) {
        try {
            await this.startVirtualDisplay();

            const browser=await puppeteer.launch({
                headless: false,  // Required for CAPTCHA solving
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    `--display=${this.display}`
                ]
            });

            const page=await browser.newPage();
            await page.setViewport({width: 1024,height: 768});

            await page.goto(url,{waitUntil: 'networkidle0'});
            await page.screenshot({path: 'screenshot_initial.png'});

            let response=await this.openai.responses.create({
                model: "computer-use-preview",
                tools: [{
                    type: "computer_use_preview",
                    display_width: 1024,
                    display_height: 768,
                    environment: "browser"
                }],
                input: [{
                    role: "user",
                    content: `If you see a CAPTCHA or verification challenge, please solve it (like checking a box, selecting images based on text, etc). 
                    You will need to behave like a human. That means:
                    1. If you see a checkbox, first hover around it naturally
                    2. Maybe move the mouse around a bit
                    3. Then click it
                    
                    Just solve the CAPTCHA if present and let me know when it's done (once you can't see the CAPTCHA anymore).
                    You cannot stop until you see the main page without CAPTCHA.
                    CAPTCHA might also just say "Please verify you are human" or something similar.
                    Send me a description of what you see every time you see a new screen.`
                }],
                reasoning: {
                    generate_summary: "concise"
                },
                truncation: "auto"
            });

            await this.computerUseLoop(page,response);

            await page.screenshot({path: 'screenshot_final.png'});
            console.log('CAPTCHA solving completed');

            await browser.close();
        } finally {
            await this.stopVirtualDisplay();
        }
    }
}

module.exports=CaptchaSolver; 