# Upwork Proposal Automation

An automated system for finding, filtering, and applying to Upwork jobs using AI-powered proposal generation and submission.

## Components

1. **Job Fetcher** (`upwork_job_fetcher.js`)
   - Fetches job listings from Upwork API
   - Handles authentication and API communication
   - Formats job data for processing

2. **Job Filter** (`job_filter.js`)
   - Implements intelligent job filtering based on multiple criteria
   - Scores jobs based on budget, client history, skills match, and description quality
   - Ranks and filters jobs based on customizable thresholds

3. **Proposal Generator** (`proposal_generator.js`)
   - Uses GPT-4 to generate customized proposals
   - Structures proposals with introduction, experience, approach, timeline, and closing
   - Adapts content based on job requirements and client preferences

4. **Proposal Submitter** (`proposal_submitter.js`)
   - Combines Puppeteer and Computer Use AI for automated submission
   - Handles login and navigation
   - Intelligently fills out proposal forms

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in a `.env` file:
   ```
   UPWORK_CLIENT_ID=your_client_id
   UPWORK_CLIENT_SECRET=your_client_secret
   UPWORK_ACCESS_TOKEN=your_access_token
   UPWORK_USERNAME=your_username
   UPWORK_PASSWORD=your_password
   OPENAI_API_KEY=your_openai_key
   ```

3. Run the application:
   ```bash
   npm start
   ```

## Configuration

You can customize the behavior by modifying:

- Job filtering criteria in `job_filter.js`
- Proposal templates in `proposal_generator.js`
- Search parameters in `upwork_job_fetcher.js`

## Security Notes

- Never commit your `.env` file
- Regularly rotate API keys
- Monitor your Upwork account for any automated activity flags
- Review proposals before submission when possible

## Contributing

Feel free to submit issues and pull requests for improvements.

## License

MIT 