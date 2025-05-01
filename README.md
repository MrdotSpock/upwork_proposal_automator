# Upwork Proposal Automation

An automated system for applying to Upwork jobs using AI-powered proposal generation and submission. This system combines headless browser automation with OpenAI's Computer Use API to create a powerful, flexible solution for Upwork freelancers.

## Architecture

### Main Components

1. **Proposal Generators**
   - **Wordware API** (`wordware_proposal_generator.js`)
     - Uses the Wordware API for proposal generation
     - Streams responses for faster processing
   - **N8N Integration** (`n8n_proposal_generator.js`)
     - Alternative generator using N8N webhook integration
     - Provides flexibility in proposal creation methods

2. **Proposal Submitter** (`proposal_submitter.js`)
   - Core automation component with dual-mode operation:
     - Headless browser mode for lightweight operation
     - Virtual display mode with VNC support for debugging and CAPTCHA handling
   - Uses OpenAI's Computer Use API for intelligent UI interaction
   - Implements Puppeteer with Stealth plugin to avoid detection
   - Handles safety checks and user confirmations

3. **Virtual Display Management**
   - Configurable Xvfb setup with XFCE desktop environment
   - VNC server for remote viewing and interactive debugging
   - Automatic cleanup of stale processes and lock files

4. **Utility Tools**
   - VNC testing utilities (`test_vnc.js`)
   - CAPTCHA handling support (`captcha_solver.js`, `test_captcha.js`)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install system dependencies (for virtual display):
   ```bash
   sudo apt-get update && sudo apt-get install -y xvfb x11vnc fluxbox
   # For full desktop environment
   sudo apt-get install -y xfce4 xfce4-goodies
   ```

3. Set up environment variables in a `.env` file:
   ```
   UPWORK_USERNAME=your_username
   UPWORK_PASSWORD=your_password
   UPWORK_ANSWER=your_security_question_answer
   OPENAI_API_KEY=your_openai_key
   WORDWARE_API_KEY=your_wordware_api_key
   N8N_WEBHOOK_URL=your_n8n_webhook_url
   
   # Optional configuration
   USE_VIRTUAL_DISPLAY=true
   MAX_PROPOSALS_PER_DAY=10
   MIN_DELAY_BETWEEN_PROPOSALS=300
   MAX_DELAY_BETWEEN_PROPOSALS=600
   ```

## Usage

### Main Proposal Automation

```bash
npm start
```

### Testing VNC Setup

```bash
npm run test-vnc
```

### Connecting to VNC

1. From your local machine:
   ```bash
   ssh -L 5900:localhost:5900 your-vps-ip
   ```

2. Use a VNC client to connect to:
   ```
   localhost:5900
   ```
   Password: `mySecretPassword`

   Alternatively, if your firewall allows direct connections:
   ```
   your-vps-ip:5900
   ```

## Configuration Options

- `USE_VIRTUAL_DISPLAY`: Set to `true` to use Xvfb/VNC, `false` for headless mode
- `MAX_PROPOSALS_PER_DAY`: Limit the number of daily proposals
- `MIN_DELAY_BETWEEN_PROPOSALS`: Minimum delay in seconds between proposals
- `MAX_DELAY_BETWEEN_PROPOSALS`: Maximum delay in seconds between proposals

## Implementation Notes

### Browser Automation

The system uses Puppeteer with the Stealth plugin to avoid detection by Upwork's anti-bot measures. This is essential for reliable operation.

### Virtual Display

The virtual display setup provides several advantages:
- Visible browser for debugging automation issues
- Ability to manually intervene for CAPTCHA or verification challenges
- Higher success rate with complex websites that detect headless browsers

### OpenAI Computer Use API

The Computer Use API enables intelligent interaction with the Upwork website:
- Dynamic form filling based on proposal content
- Complex navigation through multi-step processes
- Adaptive handling of UI variations and changes
- Safety check handling for secure operation

## Security Notes

- Never commit your `.env` file
- Use a strong VNC password and consider changing the default
- Consider SSH tunneling for VNC connections in production
- Review proposals before submission when possible

## Troubleshooting

### VNC Connection Issues
- Ensure the VNC server is running (`npm run test-vnc`)
- Check if port 5900 is accessible (firewall settings)
- Try SSH port forwarding if direct connection fails

### Automation Failures
- Review screenshot captures for UI changes
- Check browser console for JavaScript errors
- Consider running in virtual display mode to see exactly what's happening

## License

MIT 