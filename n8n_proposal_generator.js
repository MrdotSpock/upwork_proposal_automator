const {randomUUID}=require('crypto');

async function generateProposal(job) {
    // const scrapedJobDesc=await scrapeJobDescription(job);
    const strin=`Expensify is a team of generalists developing today's leading expense management tool. Maintaining our reputation as an innovative leader in the world of finance requires an incredibly reliable and secure system for processing financial transactions. Accordingly, we primarily leverage time-tested languages, but we're looking to unify our front-end across platforms. For this, we're leveraging React Native and are looking toward the community on Upwork to help solve a variety of problems, both big and small, related to this migration.

Please see the GitHub issue for full details: github.com/Expensify/App/issues/59656

Your Proposal:

- You *must* post a proposal for how you will fix this issue in the GitHub issue linked above.
- Your proposal should include a technical explanation of the changes you will make. You are not required to submit the final solution or code along with your proposal.
- Your proposal will be reviewed.
- If your proposal is accepted, you should post the proposal in Upwork and you will be hired for the job.
- AFTER your proposal is accepted in Upwork and you have accepted the offer, you may submit the code to implement your solution. To submit the code, go to the Expensify/App GitHub repo where you'll create a fork of our codebase. You'll create a branch on that fork, and when your code is ready for review, you'll create a pull request in our repository to merge your code into our codebase. Include screenshots and confirmation that you have tested the pull request on all platforms. Our engineers will review the code, and approve and merge when the code meets our requirements.

Please review our Contributor Guidelines before submitting a proposal - github.com/Expensify/App/blob/main/contributingGuides/CONTRIBUTING.md

**Important:** As documented in our CONTRIBUTING.md, payment amounts are variable, dependent on any regressions your work causes.`;
    const proposal=await generateProposalFromJobDescription(strin);
    return proposal;
}

async function generateProposalFromJobDescription(jobDescription) {
    const response=await fetch(
        process.env.N8N_WEBHOOK_URL,
        {
            method: "post",
            body: JSON.stringify({
                sessionId: randomUUID(),
                chatInput: jobDescription
            })
        }
    );

    if(!response.ok) {
        console.error("Run failed",await response.json());
        throw Error(`Run failed ${response.status}`);
    }

    const data=await response.json();
    console.log("Data",data);
    const output=data[0].output;
    console.log("Output",output);
    const proposal=output.split("Extracted Proposal")[1];

    console.log("Proposal generated successfully",proposal);
    return proposal;
}

async function scrapeJobDescription(job) {
    const scrapedJobDescResponse=await fetch(
        process.env.WORDWARE_SCRAPE_WEBHOOK_URL,
        {
            method: "post",
            body: JSON.stringify({
                inputs: {
                    upwork_url: job.url
                },
                version: "^1.0"
            }),
            headers: {
                Authorization: `Bearer ${process.env.WORDWARE_API_KEY}`,
            },
        }
    );

    if(!scrapedJobDescResponse.ok) {
        console.error("Run failed",await scrapedJobDescResponse.json());
        throw Error(`Run failed ${scrapedJobDescResponse.status}`);
    }

    const reader=scrapedJobDescResponse.body.getReader();
    const decoder=new TextDecoder();
    let buffer=[];
    let finalOutput=null;

    try {
        while(true) {
            const {done,value}=await reader.read();

            if(done) {
                break;
            }

            const chunk=decoder.decode(value);

            for(let i=0,len=chunk.length; i<len; ++i) {
                const isChunkSeparator=chunk[i]==="\n";

                if(!isChunkSeparator) {
                    buffer.push(chunk[i]);
                    continue;
                }

                const line=buffer.join("").trimEnd();
                const content=JSON.parse(line);
                const value=content.value;

                if(value.type==="generation") {
                    if(value.state==="start") {
                        console.log("\nNEW GENERATION -",value.label);
                    } else {
                        console.log("\nEND GENERATION -",value.label);
                    }
                } else if(value.type==="outputs") {
                    finalOutput=value.values["Webscrape"]["output"];
                    if(finalOutput) {
                        console.log("Job description scraped successfully");
                    } else {
                        throw Error("Job description scraping failed");
                    }
                    break;
                }

                buffer=[];
            }

            if(finalOutput) {
                break;
            }
        }
    } finally {
        reader.releaseLock();
    }

    console.log("Final output",finalOutput);

    return finalOutput;
}

module.exports={
    generateProposal
}

