const path=require('path');
require('dotenv').config({path: path.resolve(__dirname,'.env')});

// Add debugging
console.log('Environment check:');
console.log('OPENAI_API_KEY exists:',!!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:',process.env.OPENAI_API_KEY?.length);


const OpenAI=require('openai');
const {spawn}=require('child_process');
const puppeteer=require('puppeteer-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');

const openai=new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class ProposalSubmitter {
    constructor() {
        this.browser=null;
        this.page=null;
        this.xvfbProcess=null;
        this.display=':99';
        this.vncProcess=null;
    }

    async startVirtualDisplay() {
        console.log('Starting virtual display...');

        // Clean up any stale X server files
        try {
            const displayNum=this.display.slice(1);
            const rm=spawn('rm',['-f',
                `/tmp/.X${displayNum}-lock`,
                `/tmp/.X11-unix/X${displayNum}`
            ]);
            await new Promise((resolve,reject) => {
                rm.on('close',(code) => {
                    if(code===0) {
                        console.log('Cleaned up stale X server files');
                        resolve();
                    } else {
                        reject(new Error('Failed to clean up X server files'));
                    }
                });
            });
        } catch(error) {
            console.log('No stale X server files to clean up');
        }

        // Kill any existing Xvfb process
        try {
            const kill=spawn('pkill',['-f',`Xvfb ${this.display}`]);
            await new Promise((resolve,reject) => {
                kill.on('close',(code) => {
                    if(code===0) {
                        console.log('Killed existing Xvfb process');
                        resolve();
                    } else {
                        console.log('No existing Xvfb process to kill');
                        resolve();
                    }
                });
            });
        } catch(error) {
            console.log('No existing Xvfb process to kill');
        }

        // Set display environment variable
        process.env.DISPLAY=this.display;

        this.xvfbProcess=spawn('Xvfb',[
            this.display,
            '-screen','0','1024x768x24',
            '-ac'
        ]);

        // Add error handling for Xvfb
        this.xvfbProcess.stderr.on('data',(data) => {
            console.error('Xvfb error:',data.toString());
        });

        // Wait for Xvfb to start
        await new Promise((resolve,reject) => {
            setTimeout(() => {
                if(this.xvfbProcess.killed) {
                    reject(new Error('Xvfb failed to start'));
                } else {
                    resolve();
                }
            },2000);
        });

        // Start a basic window manager (fluxbox)
        try {
            const fluxbox=spawn('fluxbox',['-display',this.display]);
            fluxbox.stderr.on('data',(data) => {
                console.error('Fluxbox error:',data.toString());
            });
            // Give fluxbox time to start
            await new Promise(resolve => setTimeout(resolve,1000));
        } catch(error) {
            console.log('Could not start window manager:',error);
        }

        // Start VNC server
        console.log('Starting VNC server...');
        this.vncProcess=spawn('x11vnc',[
            '-display',this.display,
            '-forever',
            '-passwd','mySecretPassword',
            '-shared',
            '-geometry','1024x768'
        ]);

        // Add error handling for VNC
        this.vncProcess.stderr.on('data',(data) => {
            console.error('VNC server error:',data.toString());
        });

        // Wait for VNC server to start and verify it's running
        await new Promise((resolve,reject) => {
            const timeout=setTimeout(() => {
                reject(new Error('VNC server failed to start within timeout'));
            },5000);

            const checkVNC=() => {
                const ss=spawn('ss',['-tuln']);
                ss.stdout.on('data',(data) => {
                    if(data.toString().includes(':5900')) {
                        clearTimeout(timeout);
                        resolve();
                    } else {
                        setTimeout(checkVNC,500);
                    }
                });
                ss.stderr.on('data',(data) => {
                    console.error('ss error:',data.toString());
                });
            };
            checkVNC();
        });

        console.log('Virtual display and VNC server started successfully');
        console.log('You can connect to VNC in one of two ways:');
        console.log('1. Direct connection (if port 5900 is open):');
        console.log('   your-vps-ip:5900');
        console.log('2. SSH port forwarding (if direct connection fails):');
        console.log('   First run: ssh -L 5900:localhost:5900 your-vps-ip');
        console.log('   Then connect to: localhost:5900');
    }

    async stopVirtualDisplay() {
        if(this.vncProcess) {
            try {
                this.vncProcess.kill();
                console.log('VNC server stopped');
            } catch(error) {
                console.error('Error stopping VNC server:',error);
            }
        }
        if(this.xvfbProcess) {
            try {
                this.xvfbProcess.kill();
                console.log('Virtual display stopped');
            } catch(error) {
                console.error('Error stopping virtual display:',error);
            }
        }
    }

    async initialize() {
        try {
            await this.startVirtualDisplay();

            puppeteer.use(StealthPlugin());
            this.browser=await puppeteer.launch({
                headless: false,  // Use real browser with virtual display
                defaultViewport: {
                    width: 1024,
                    height: 768
                },
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    `--display=${this.display}`,
                    '--start-maximized'
                ]
            });

            this.page=await this.browser.newPage();
            await this.page.setViewport({
                width: 1024,
                height: 768
            });

            // Add some randomization to appear more human-like
            await this.page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br'
            });

            // Set a realistic user agent
            await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        } catch(error) {
            console.error('Error in initialize:',error);
            await this.stopVirtualDisplay();
            throw error;
        }
    }

    async close() {
        if(this.browser) {
            await this.browser.close();
        }
        await this.stopVirtualDisplay();
    }

    async handleComputerAction(action) {
        console.log('Handling computer action:',action);
        try {
            switch(action.type) {
                case "click": {
                    const {x,y}=action;
                    await this.page.mouse.click(x,y);
                    break;
                }

                case "scroll": {
                    const {x,y,scrollX,scrollY}=action;
                    await this.page.mouse.move(x,y);
                    await this.page.evaluate(`window.scrollBy(${scrollX}, ${scrollY})`);
                    break;
                }
                case "wait": {
                    await new Promise(resolve => setTimeout(resolve,2000));
                    break;
                }
                case "navigate": {
                    const {url}=action;
                    await this.page.goto(url,{waitUntil: 'networkidle0'});
                    break;
                }

                case "move": {
                    const {x,y}=action;
                    await this.page.mouse.move(x,y);
                    break;
                }

                case "type": {
                    const {text}=action;
                    if(text.includes("username")) {
                        console.log('Typing username:');
                        await this.page.keyboard.type(process.env.UPWORK_USERNAME);
                    } else if(text.includes("password")) {
                        console.log('Typing password:');
                        await this.page.keyboard.type(process.env.UPWORK_PASSWORD);
                    }
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

    async computerUseLoop(response) {
        while(true) {
            console.log('Computer use loop response:',JSON.stringify(response,null,2));
            const computerCalls=response.output.filter(
                item => item.type==="computer_call"
            );

            if(computerCalls.length===0) {
                break;
            }

            for(const call of computerCalls) {
                await this.handleComputerAction(call.action);
                await this.page.screenshot({path: `screenshot_action_${Date.now()}.png`});
            }

            const messages=response.output.filter(
                item => item.type==="message"
            );

            if(messages.length!==0) {
                console.log('Message:',messages[0].content[0].text);
                if(messages[0].content[0].text.includes("username")) {
                    console.log('Typing username:');
                    await this.page.keyboard.type(process.env.UPWORK_USERNAME);
                } else if(messages[0].content[0].text.includes("password")) {
                    console.log('Typing password:');
                    await this.page.keyboard.type(process.env.UPWORK_PASSWORD);
                }
            }

            const screenshot=await this.page.screenshot();
            const screenshotBase64=screenshot.toString('base64');

            response=await openai.responses.create({
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
                    current_url: await this.page.url()
                }],
                truncation: "auto"
            });
        }
        return response;
    }

    async login() {
        try {
            await this.page.goto('https://www.upwork.com/ab/account-security/login',{
                waitUntil: 'networkidle0'
            });

            console.log('Browser launched and navigated to Upwork login page.');
            console.log('Please complete the login process manually, including any CAPTCHA.');
            console.log('The browser will remain open for you to interact with.');
            console.log('Once you have successfully logged in, press Enter in this terminal to continue...');

            // Wait for user to press Enter
            await new Promise(resolve => process.stdin.once('data',resolve));

            // Verify we're logged in by checking for common elements that appear after login
            await this.page.waitForSelector('div[data-test="nav-bar"]',{timeout: 30000});
            console.log('Login successful, continuing with automation...');

            await this.page.screenshot({path: 'screenshot_initial.png'});

            // First use Computer Use to handle any CAPTCHA
            // let response=await openai.responses.create({
            //     model: "computer-use-preview",
            //     tools: [{
            //         type: "computer_use_preview",
            //         display_width: 1024,
            //         display_height: 768,
            //         environment: "browser"
            //     }],
            //     input: [{
            //         role: "user",
            //         content: `If you see a CAPTCHA or verification challenge, please solve it (like checking a box, selecting images based on text, etc). You will need to behave like a human. That means if you see a checkbox don't just click it directly, hover around it, maybe click outside first and then click it.
            //         Just solve the CAPTCHA if present and let me know when it's done (once you can't see the CAPTCHA anymore, you will see upwork login page). You cannot stop until you see the upwork login page. CAPTCHA might also just say "Please verify you are human" or something similar. Send me a description of what you see every time you see a new screen.`
            //     }],
            //     reasoning: {
            //         generate_summary: "concise"
            //     },
            //     truncation: "auto"
            // });

            // await this.computerUseLoop(response);

            // console.log('CAPTCHA solved');
            // await this.page.screenshot({path: 'screenshot_post_captcha.png'});

            // Now proceed with Puppeteer for the actual login
            // Step 1: Enter email and click continue
            // await this.page.waitForSelector('input[inputmode="username email"]');
            // await this.page.type('input[inputmode="username email"]',process.env.UPWORK_USERNAME);
            // await this.page.screenshot({path: 'screenshot_after_email.png'});

            // await this.page.click('button#login_password_continue[button-role="continue"]');

            // await this.page.screenshot({path: 'screenshot_login.png'});

            // await new Promise(resolve => setTimeout(resolve,10000));
            // await this.page.screenshot({path: 'screenshot_pswd.png'});

            // console.log('Waiting for password field to appear');
            // // Wait for password field to appear
            // await this.page.waitForSelector('#login_password');
            // await this.page.screenshot({path: 'screenshot_login_2.png'});

            // // Step 2: Enter password and submit
            // await this.page.type('#login_password',process.env.UPWORK_PASSWORD);
            // await this.page.click('#login_control_continue');

            // // Wait for navigation
            // await this.page.waitForNavigation();

            // await this.page.screenshot({path: 'screenshot_login_3.png'});

            // Verify login success
            // const isLoggedIn=await this.page.evaluate(() => {
            //     return !document.querySelector('input[inputmode="username email"]');
            // });

            // if(!isLoggedIn) {
            //     throw new Error('Login failed');
            // }

            console.log('Login successful');
        } catch(error) {
            console.error('Login error:',error);
            throw error;
        }
    }

    async navigateToJob(jobUrl) {
        await this.page.goto(jobUrl);
        await this.page.waitForSelector('button[data-test="apply-button"]');
    }

    async submitProposalWithComputerUse(job,proposal) {
        try {
            // Take screenshot for computer use
            const screenshot=await this.page.screenshot();
            const screenshotBase64=screenshot.toString('base64');

            // Initialize computer use session
            let response=await openai.responses.create({
                model: "computer-use-preview",
                tools: [{
                    type: "computer_use_preview",
                    display_width: 1024,
                    display_height: 768,
                    environment: "browser"
                }],
                input: [{
                    role: "user",
                    content: `Submit this proposal to the Upwork job. Here's the proposal content:
                    ${proposal.fullProposal}
                    
                    Proposed rate: ${proposal.proposedRate}
                    Estimated duration: ${proposal.estimatedDuration}
                    
                    Please fill out the proposal form carefully and submit it.`
                }],
                reasoning: {
                    generate_summary: "concise"
                },
                truncation: "auto"
            });

            // Computer use loop
            while(true) {
                const computerCalls=response.output.filter(
                    item => item.type==="computer_call"
                );

                if(computerCalls.length===0) {
                    break;
                }

                for(const call of computerCalls) {
                    await this.handleComputerAction(call.action);
                }

                // Take new screenshot after action
                const newScreenshot=await this.page.screenshot();
                const newScreenshotBase64=newScreenshot.toString('base64');

                // Send screenshot back
                response=await openai.responses.create({
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
                            image_url: `data:image/png;base64,${newScreenshotBase64}`
                        },
                        current_url: await this.page.url()
                    }],
                    truncation: "auto"
                });
            }

            return true;
        } catch(error) {
            console.error('Error in computer use submission:',error);
            throw error;
        }
    }
}

async function submitProposal(job,proposal) {
    const submitter=new ProposalSubmitter();

    try {
        await submitter.initialize();
        await submitter.login();
        console.log('Login completed');
        return true;
    } catch(error) {
        console.error('Error submitting proposal:',error);
        throw error;
    } finally {
        await submitter.close();
    }
}

module.exports={
    submitProposal
}; 