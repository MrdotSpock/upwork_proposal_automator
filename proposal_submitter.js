const path=require('path');
require('dotenv').config({path: path.resolve(__dirname,'.env')});

const OpenAI=require('openai');
const {spawn}=require('child_process');
const puppeteer=require('puppeteer-extra');
const StealthPlugin=require('puppeteer-extra-plugin-stealth');


const openai=new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class ProposalSubmitter {
    constructor(config={}) {
        this.useVirtualDisplay=config.useVirtualDisplay||false;
        this.display=':99';
        this.xvfbProcess=null;
        this.vncProcess=null;
        this.browser=null;
        this.page=null;
        this.initialized=false;
        this.screenWidth=1920;
        this.screenHeight=1080;
    }

    async initialize() {
        if(this.initialized) {
            console.log('Already initialized');
            return;
        }

        try {
            puppeteer.use(StealthPlugin());
            await this.startVirtualDisplay();
            await this.startBrowser();
            this.initialized=true;
        } catch(error) {
            console.error('Failed to initialize:',error);
            await this.cleanup();
            throw error;
        }
    }

    async startVirtualDisplay() {
        if(!this.useVirtualDisplay) {
            console.log('Running in headless mode without virtual display');
            return;
        }

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

        // Start Xvfb with a larger screen size and color depth
        this.xvfbProcess=spawn('Xvfb',[
            this.display,
            '-screen','0',`${this.screenWidth}x${this.screenHeight}x24`,
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

        // Start XFCE session
        try {
            const xfce=spawn('startxfce4',['-display',this.display]);
            xfce.stderr.on('data',(data) => {
                console.error('XFCE error:',data.toString());
            });
            // Give XFCE time to start
            await new Promise(resolve => setTimeout(resolve,5000));
        } catch(error) {
            console.log('Could not start XFCE:',error);
        }

        // Start VNC server with better settings
        console.log('Starting VNC server...');
        this.vncProcess=spawn('x11vnc',[
            '-display',this.display,
            '-forever',
            '-passwd','mySecretPassword',
            '-shared',
            '-geometry',`${this.screenWidth}x${this.screenHeight}`,
            '-depth','24',
            '-rfbport','5900',
            '-noxdamage',
            '-noxfixes',
            '-noxrecord'
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
        console.log('Password: mySecretPassword');
    }

    async startBrowser() {
        console.log('Starting browser...');
        const options={
            headless: !this.useVirtualDisplay,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                `--window-size=${this.screenWidth},${this.screenHeight}`
            ]
        };

        if(this.useVirtualDisplay) {
            options.args.push(`--display=${this.display}`);
        }

        this.browser=await puppeteer.launch(options);
        this.page=await this.browser.newPage();
        await this.page.setViewport({width: this.screenWidth,height: this.screenHeight});
        console.log('Browser started successfully');
    }

    async cleanup() {
        if(this.browser) {
            await this.browser.close();
        }
        if(this.vncProcess) {
            this.vncProcess.kill();
        }
        if(this.xvfbProcess) {
            this.xvfbProcess.kill();
        }
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
                    console.log('Scrolling...',action);
                    const {x,y,scroll_x,scroll_y}=action;
                    await this.page.mouse.move(x,y);
                    await this.page.evaluate(`window.scrollBy(${scroll_x}, ${scroll_y})`);
                    break;
                }
                case "wait": {
                    await new Promise(resolve => setTimeout(resolve,2000));
                    break;
                }

                case "drag": {
                    const {x,y,scroll_x,scroll_y}=action;
                    await this.page.mouse.move(x,y);
                    await this.page.mouse.down();
                    await this.page.evaluate(`window.scrollBy(${scroll_x}, ${scroll_y})`);
                    await this.page.mouse.up();
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
                    await this.page.keyboard.type(text);
                    break;
                }

                case "keypress": {
                    //get keys array
                    const {keys}=action;
                    if(keys.includes("CTRL")) {
                        await this.page.keyboard.down("ControlLeft");
                        //remove CTRL from keys
                        const filteredKeys=keys.filter(key => key!=="CTRL");
                        for(const key of filteredKeys) {
                            await this.page.keyboard.press('Key'+key);
                        }
                        await this.page.keyboard.up("ControlLeft");
                    } else if(keys.includes("BACKSPACE")) {
                        await this.page.keyboard.press('Backspace');
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

            const summaries=response.output.filter(
                item => item.type==="reasoning"
            );

            console.log('Summaries:',summaries);

            if(summaries.length!==0&&summaries[0].summary.length!==0) {
                console.log('Summary:',summaries[0].summary[0].text);
            }

            const screenshot=await this.page.screenshot();
            const screenshotBase64=screenshot.toString('base64');

            response=await openai.responses.create({
                model: "computer-use-preview",
                previous_response_id: response.id,
                tools: [{
                    type: "computer_use_preview",
                    display_width: this.screenWidth,
                    display_height: this.screenHeight,
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
        if(!this.initialized) {
            await this.initialize();
        }

        try {
            await this.page.goto('https://www.upwork.com/ab/account-security/login',{
                waitUntil: 'networkidle0'
            });

            //Manual login using VNC Attempt (works)
            // console.log('Browser launched and navigated to Upwork login page.');
            // console.log('Please complete the login process manually, including any CAPTCHA.');
            // console.log('The browser will remain open for you to interact with.');
            // console.log('Once you have successfully logged in, press Enter in this terminal to continue...');
            // Wait for user to press Enter
            // await new Promise(resolve => process.stdin.once('data',resolve));

            // // Verify we're logged in by checking for common elements that appear after login
            // await this.page.waitForSelector('div[data-test="nav-bar"]',{timeout: 30000});
            // console.log('Login successful, continuing with automation...');

            // await this.page.screenshot({path: 'screenshot_initial.png'});

            // CUA Attempt to pass the CAPTCHA (does not work), the solution is to use Stealth Plugin for Puppeteer
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

            // Current Solution: Use Puppeteer for the actual login
            // Step 1: Enter email and click continue
            console.log('Waiting for email input field to appear');
            await this.page.waitForSelector('input[inputmode="username email"]');
            console.log('Email input field found, typing username');
            await this.page.type('input[inputmode="username email"]',process.env.UPWORK_USERNAME);
            await this.page.screenshot({path: 'screenshot_after_email.png'});
            console.log('Username typed, clicking continue');
            await this.page.click('button#login_password_continue[button-role="continue"]');
            console.log('Clicked continue, waiting for password input field to appear');
            await this.page.screenshot({path: 'screenshot_login.png'});

            await new Promise(resolve => setTimeout(resolve,10000));
            await this.page.screenshot({path: 'screenshot_pswd.png'});


            // Wait for password field to appear
            await this.page.waitForSelector('#login_password');
            await this.page.screenshot({path: 'screenshot_login_2.png'});

            // Step 2: Enter password and submit
            await this.page.type('#login_password',process.env.UPWORK_PASSWORD);
            console.log('Password typed, clicking continue');
            await this.page.click('#login_control_continue');
            console.log('Clicked continue, waiting for answer input field to appear');
            try {
                await this.page.waitForSelector('#login_answer',{timeout: 10000});
                console.log('Answer input field found, typing answer');
                await this.page.screenshot({path: 'screenshot_login_3.png'});

                // Step 3: Enter password and submit
                await this.page.type('#login_answer',process.env.UPWORK_ANSWER);
                console.log('Answer typed, clicking continue');
                await this.page.click('#login_control_continue');
            } catch(error) {
                console.log('No login_answer field found, continuing...');
            }

            console.log('Waiting for login to complete');
            await new Promise(resolve => setTimeout(resolve,1000));
            await this.page.screenshot({path: 'screenshot_login_4.png'});

            // Verify login success
            const isLoggedIn=await this.page.evaluate(() => {
                return !document.querySelector('input[inputmode="username email"]');
            });

            if(!isLoggedIn) {
                throw new Error('Login failed');
            }

            console.log('Login successful');
            await this.page.screenshot({path: 'screenshot_login_5.png'});
        } catch(error) {
            console.error('Login error:',error);
            throw error;
        }
    }

    async navigateToJob(jobUrl) {
        console.log('Navigating to job:',jobUrl);
        await this.page.goto(jobUrl);
        console.log('Navigated to job:',jobUrl);
    }

    async submitProposalWithComputerUse(job,proposal) {
        console.log('Submitting proposal with computer use...');
        try {
            // Take screenshot for computer use
            const screenshot=await this.page.screenshot();

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
                    content: `
                    Your goal is to prefill the proposal page on Upwork. You are already on the proposal page.

                    Start by clicking on 'Apply now' button, then scroll down to find the sections mentioned below.

                    1. Find the 'How do you want to be paid' section, select 'By Project' and set 2000USD.

                    2. Find the 'Cover Letter' section, fill it out with the proposal content below. 
                    
                    3. DO NOT SUBMIT IT. You can stop when you fill out those sections.

                    The proposal content:
                    ${proposal}
                
                    `


                }],
                reasoning: {
                    generate_summary: "concise"
                },
                truncation: "auto"
            });

            // Computer use loop
            await this.computerUseLoop(response);
            console.log('Proposal submitted successfully');
            return true;
        } catch(error) {
            console.error('Error in computer use submission:',error);
            throw error;
        }
    }

    async submitProposal(job,proposal) {
        console.log('Submitting proposal...');
        if(!this.initialized) {
            await this.initialize();
        }

        try {
            await this.navigateToJob(job.url);
            await this.submitProposalWithComputerUse(job,proposal);
            return true;
        } catch(error) {
            console.error('Error submitting proposal:',error);
            throw error;
        }
    }
}

async function submitProposal(job,proposal) {
    const submitter=new ProposalSubmitter();

    try {
        await submitter.startVirtualDisplay();
        await submitter.startBrowser();
        await submitter.login();

        await submitter.navigateToJob(job.url);
        await submitter.submitProposal(job,proposal);
        return true;
    } catch(error) {
        console.error('Error submitting proposal:',error);
        throw error;
    } finally {
        await submitter.cleanup();
    }
}

// Export the class as default and the function as named export
module.exports=ProposalSubmitter;
module.exports.submitProposal=submitProposal; 