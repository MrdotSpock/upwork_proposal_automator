const ProposalSubmitter=require('./proposal_submitter');
// const {generateProposal}=require('./wordware_proposal_generator');
const {generateProposal}=require('./n8n_proposal_generator');

async function main() {
    // Configuration
    const config={
        useVirtualDisplay: process.env.USE_VIRTUAL_DISPLAY==='true',
        maxProposalsPerDay: parseInt(process.env.MAX_PROPOSALS_PER_DAY)||50,
        minDelayBetweenProposals: parseInt(process.env.MIN_DELAY_BETWEEN_PROPOSALS)||300,
        maxDelayBetweenProposals: parseInt(process.env.MAX_DELAY_BETWEEN_PROPOSALS)||600
    };

    console.log('Starting Upwork proposal automation with config:',config);

    const submitter=new ProposalSubmitter(config);
    let proposalsSubmitted=0;

    try {
        const job={
            url: 'https://www.upwork.com/jobs/~021910727087738324999?referrer_url_path=%2Fnx%2Fsearch%2Fjobs%2Fdetails%2F~021910727087738324999'
        };
        // const proposal = await generateProposal(job);
        const proposal=await generateProposal(job);
        console.log("Proposal generated successfully",proposal);
        await submitter.login();
        console.log('Login completed');
        await submitter.submitProposal(job,proposal);
    } catch(error) {
        console.error('Error in main process:',error);
        throw error;
    } finally {
        await submitter.cleanup();
    }
}

main().catch(console.error);