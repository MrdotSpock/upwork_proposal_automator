const {randomUUID}=require('crypto');

async function generateProposal(job) {
    const scrapedJobDesc=await scrapeJobDescription(job);

    const proposal=await generateProposalFromJobDescription(scrapedJobDesc);
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

