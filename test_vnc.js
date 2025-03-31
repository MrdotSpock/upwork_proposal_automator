const {spawn}=require('child_process');

class VNCTester {
    constructor() {
        this.xvfbProcess=null;
        this.vncProcess=null;
        this.display=':99';
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
}

async function testVNC() {
    const tester=new VNCTester();

    try {
        await tester.startVirtualDisplay();
        console.log('VNC test setup complete. Press Ctrl+C to exit...');

        // Keep the process running until Ctrl+C
        process.on('SIGINT',async () => {
            console.log('Shutting down...');
            await tester.stopVirtualDisplay();
            process.exit(0);
        });
    } catch(error) {
        console.error('Error in VNC test:',error);
        await tester.stopVirtualDisplay();
        process.exit(1);
    }
}

testVNC(); 