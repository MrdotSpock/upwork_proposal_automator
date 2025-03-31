
const {submitProposal}=require('./proposal_submitter');

async function main() {
    try {
        // 1. Fetch jobs from Upwork
        // console.log('Fetching jobs from Upwork...');
        // const jobs=await fetchJobs();

        // // 2. Filter jobs based on our criteria
        // console.log('Filtering jobs...');
        // const filteredJobs=await filterJobs(jobs);

        // // 3. For each filtered job, generate and submit proposal
        // console.log(`Processing ${filteredJobs.length} jobs...`);
        // for(const job of filteredJobs) {
        //     try {
        //         // Generate proposal
        //         console.log(`Generating proposal for job: ${job.title}`);
        //         const proposal=await generateProposal(job);

        //         // Submit proposal
        //         console.log('Submitting proposal...');
        //         await submitProposal(job,proposal);

        //         // Wait between submissions to avoid rate limiting
        //         await new Promise(resolve => setTimeout(resolve,5000));
        //     } catch(error) {
        //         console.error(`Error processing job ${job.title}:`,error);
        //         continue;
        //     }
        // }

        await submitProposal(null,null);

        console.log('Job processing completed!');
    } catch(error) {
        console.error('Main process error:',error);
    }
}

// Run the main function
main(); 