const ProposalSubmitter=require('./proposal_submitter');
const {generateProposal}=require('./wordware_proposal_generator');

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
        await submitter.login();
        console.log('Login completed');

        // while(proposalsSubmitted<config.maxProposalsPerDay) {
        //     const jobs=await getJobs();
        //     console.log(`Found ${jobs.length} jobs to process`);

        //     for(const job of jobs) {
        //         if(proposalsSubmitted>=config.maxProposalsPerDay) {
        //             console.log('Reached daily proposal limit');
        //             break;
        //         }

        //         try {
        //             const proposal=await generateProposal(job);
        //             if(proposal) {
        //                 await submitter.submitProposal(job,proposal);
        //                 proposalsSubmitted++;
        //                 console.log(`Proposal submitted successfully (${proposalsSubmitted}/${config.maxProposalsPerDay})`);

        //                 // Random delay between proposals
        //                 const delay=Math.floor(Math.random()*(config.maxDelayBetweenProposals-config.minDelayBetweenProposals+1))+config.minDelayBetweenProposals;
        //                 console.log(`Waiting ${delay} seconds before next proposal...`);
        //                 await sleep(delay*1000);
        //             }
        //         } catch(error) {
        //             console.error('Error processing job:',error);
        //         }
        //     }

        //     // Wait before checking for new jobs
        //     await sleep(300000); // 5 minutes
        // }
        const job={url: 'https://www.upwork.com/jobs/~01f900000000000000000000'};
        // const proposal = await generateProposal(job);
        await submitter.submitProposal(job,'test proposal');
    } catch(error) {
        console.error('Error in main process:',error);
        throw error;
    } finally {
        await submitter.cleanup();
    }
}

main().catch(console.error);